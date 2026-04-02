import { randomUUID } from "crypto";
import { promises as fsPromises } from "fs";
import path from "path";

import {
  DocumentAiRequestPriority,
  DocumentAiRequestStatus,
  DocumentStatus,
  UserRole,
  type Prisma
} from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  type CreateDocumentAiRequestInput,
  type CreateDocumentAiRequestPublicLinkInput,
  type ListDocumentAiRequestsQuery,
  type PublicUploadRequestDocumentBody,
  type UpdateDocumentAiRequestInput,
  type UploadRequestDocumentBody
} from "./documents-ai-requests.schema";
import { queueDocumentIndexation } from "./documents-intelligence.service";
import { sanitizeDocumentTitle, sanitizeOptionalText } from "./documents-text.util";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "documents");
const ALLOWED_PDF_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf"
]);

const hasManagementAccess = (role: UserRole) => role === UserRole.ADMIN || role === UserRole.GESTOR;

const isPdfBuffer = (buffer: Buffer) => {
  if (!buffer || buffer.length < 5) {
    return false;
  }
  const sniffWindow = buffer.subarray(0, Math.min(buffer.length, 1024)).toString("ascii");
  return sniffWindow.includes("%PDF-");
};

const ensurePdfUpload = (file: Express.Multer.File) => {
  const hasAllowedMime = ALLOWED_PDF_MIME_TYPES.has((file.mimetype || "").toLowerCase());
  const hasPdfSignature = isPdfBuffer(file.buffer);
  if (!hasAllowedMime && !hasPdfSignature) {
    throw new Error(`O arquivo \"${file.originalname}\" nao e um PDF valido.`);
  }
  if (!isPdfBuffer(file.buffer)) {
    throw new Error(`O arquivo \"${file.originalname}\" nao e um PDF valido.`);
  }
};

const stageUploadedFiles = async (files: Express.Multer.File[]) => {
  if (files.length === 0) {
    throw new Error("Envie pelo menos um arquivo PDF.");
  }

  await fsPromises.mkdir(UPLOAD_DIR, { recursive: true });

  const staged: Array<{
    filePath: string;
    originalName: string;
  }> = [];

  try {
    for (const file of files) {
      ensurePdfUpload(file);
      const filePath = path.join(UPLOAD_DIR, `${Date.now()}-${randomUUID()}.pdf`);
      await fsPromises.writeFile(filePath, file.buffer);
      staged.push({
        filePath,
        originalName: file.originalname || "documento.pdf"
      });
    }
    return staged;
  } catch (error) {
    await Promise.all(staged.map((item) => fsPromises.unlink(item.filePath).catch(() => undefined)));
    throw error;
  }
};

const requestSelect = {
  id: true,
  titulo: true,
  descricao: true,
  prioridade: true,
  status: true,
  prazo: true,
  createdAt: true,
  updatedAt: true,
  requestedByUser: { select: { id: true, nome: true, email: true } },
  fulfilledByUser: { select: { id: true, nome: true, email: true } },
  publicLinks: {
    where: { ativo: true },
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    take: 1,
    select: {
      token: true,
      ativo: true,
      expiraEm: true,
      createdAt: true
    }
  },
  documents: {
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    select: {
      id: true,
      titulo: true,
      arquivoNome: true,
      status: true,
      createdAt: true
    }
  }
} satisfies Prisma.DocumentAiRequestSelect;

const mapRequest = (
  item: Prisma.DocumentAiRequestGetPayload<{ select: typeof requestSelect }>,
  publicBasePath = "/api/v1/public/document-ai-requests"
) => {
  const activeLink = item.publicLinks[0] ?? null;
  return {
    id: item.id,
    titulo: sanitizeDocumentTitle(item.titulo),
    descricao: sanitizeOptionalText(item.descricao),
    prioridade: item.prioridade,
    status: item.status,
    prazo: item.prazo?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    solicitado_por: item.requestedByUser,
    atendido_por: item.fulfilledByUser,
    total_documentos: item.documents.length,
    documentos: item.documents.map((doc) => ({
      id: doc.id,
      titulo: sanitizeDocumentTitle(doc.titulo),
      arquivoNome: sanitizeDocumentTitle(doc.arquivoNome, 255),
      status: doc.status,
      createdAt: doc.createdAt.toISOString()
    })),
    solicitacao_externa: activeLink
      ? {
          token: activeLink.token,
          ativo: activeLink.ativo,
          expira_em: activeLink.expiraEm.toISOString(),
          created_at: activeLink.createdAt.toISOString(),
          link_publico: `${publicBasePath}/${activeLink.token}`
        }
      : null
  };
};

const createDocumentsForRequest = async (payload: {
  requestId: number;
  requestTitle: string;
  requestDescription: string | null;
  files: Array<{ filePath: string; originalName: string }>;
  createdByUserId: number;
  titleOverride?: string;
  descriptionOverride?: string;
  senderName?: string;
  fulfilledByUserId?: number | null;
}) => {
  const baseTitle = sanitizeDocumentTitle(payload.titleOverride ?? payload.requestTitle);
  const baseDescription =
    sanitizeOptionalText(payload.descriptionOverride) ?? sanitizeOptionalText(payload.requestDescription) ?? undefined;

  const created = await prisma.$transaction(async (tx) => {
    const documents = [] as Array<{
      id: number;
      titulo: string;
      arquivoNome: string;
      status: DocumentStatus;
      createdAt: Date;
    }>;

    for (let index = 0; index < payload.files.length; index += 1) {
      const staged = payload.files[index];
      const resolvedTitle = sanitizeDocumentTitle(
        payload.files.length > 1 ? `${baseTitle} (${index + 1})` : baseTitle
      );
      const descriptionFromSender = payload.senderName
        ? `${baseDescription ? `${baseDescription} | ` : ""}Enviado por: ${payload.senderName}`
        : baseDescription;

      const document = await tx.document.create({
        data: {
          titulo: resolvedTitle,
          descricao: descriptionFromSender,
          arquivoPath: staged.filePath,
          arquivoNome: staged.originalName,
          status: DocumentStatus.PENDENTE,
          aiRequestId: payload.requestId,
          createdByUserId: payload.createdByUserId
        },
        select: {
          id: true,
          titulo: true,
          arquivoNome: true,
          status: true,
          createdAt: true
        }
      });

      documents.push(document);
    }

    const request = await tx.documentAiRequest.update({
      where: { id: payload.requestId },
      data: {
        status: DocumentAiRequestStatus.ATENDIDA,
        fulfilledByUserId: payload.fulfilledByUserId === undefined ? undefined : payload.fulfilledByUserId
      },
      select: requestSelect
    });

    return {
      request,
      documents
    };
  });

  for (const doc of created.documents) {
    queueDocumentIndexation(doc.id);
  }

  return {
    request: mapRequest(created.request),
    documentos: created.documents.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt.toISOString()
    }))
  };
};

export const createDocumentAiRequest = async (input: CreateDocumentAiRequestInput, requestedByUserId: number) => {
  const created = await prisma.documentAiRequest.create({
    data: {
      titulo: sanitizeDocumentTitle(input.titulo),
      descricao: sanitizeOptionalText(input.descricao),
      prioridade: input.prioridade ?? DocumentAiRequestPriority.MEDIA,
      status: DocumentAiRequestStatus.ABERTA,
      prazo: input.prazo ? new Date(input.prazo) : null,
      requestedByUserId
    },
    select: requestSelect
  });

  return mapRequest(created);
};

export const listDocumentAiRequests = async (
  query: ListDocumentAiRequestsQuery,
  currentUser: { id: number; role: UserRole }
) => {
  const where: Prisma.DocumentAiRequestWhereInput = {};

  if (query.status) {
    where.status = query.status;
  }
  if (query.prioridade) {
    where.prioridade = query.prioridade;
  }
  if (query.q) {
    where.OR = [{ titulo: { contains: query.q.trim() } }, { descricao: { contains: query.q.trim() } }];
  }
  if (!hasManagementAccess(currentUser.role)) {
    where.requestedByUserId = currentUser.id;
  }

  const items = await prisma.documentAiRequest.findMany({
    where,
    select: requestSelect,
    orderBy: [{ status: "asc" }, { prioridade: "desc" }, { createdAt: "desc" }],
    take: query.limit ?? 30,
    skip: query.offset ?? 0
  });

  const total = await prisma.documentAiRequest.count({ where });

  return {
    total,
    itens: items.map((item) => mapRequest(item))
  };
};

export const getDocumentAiRequestById = async (id: number, currentUser: { id: number; role: UserRole }) => {
  const item = await prisma.documentAiRequest.findUnique({
    where: { id },
    select: requestSelect
  });

  if (!item) {
    return null;
  }

  if (!hasManagementAccess(currentUser.role) && item.requestedByUser.id !== currentUser.id) {
    return null;
  }

  return mapRequest(item);
};

export const updateDocumentAiRequest = async (
  id: number,
  input: UpdateDocumentAiRequestInput,
  currentUser: { id: number; role: UserRole }
) => {
  const existing = await prisma.documentAiRequest.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      requestedByUserId: true,
      _count: {
        select: {
          documents: true
        }
      }
    }
  });

  if (!existing) {
    return null;
  }

  const canManage = hasManagementAccess(currentUser.role);
  if (!canManage && existing.requestedByUserId !== currentUser.id) {
    return null;
  }

  if (existing.status === DocumentAiRequestStatus.ATENDIDA) {
    throw new Error("Solicitacao ja atendida e nao pode ser alterada.");
  }

  if (input.status === DocumentAiRequestStatus.ATENDIDA && existing._count.documents === 0) {
    throw new Error("Nao e possivel marcar como ATENDIDA sem ao menos um documento vinculado.");
  }

  const updated = await prisma.documentAiRequest.update({
    where: { id },
    data: {
      titulo: input.titulo === undefined ? undefined : sanitizeDocumentTitle(input.titulo),
      descricao: input.descricao === undefined ? undefined : sanitizeOptionalText(input.descricao),
      prioridade: input.prioridade,
      status: input.status,
      prazo: input.prazo === undefined ? undefined : input.prazo === null ? null : new Date(input.prazo)
    },
    select: requestSelect
  });

  return mapRequest(updated);
};

export const createDocumentAiRequestPublicLink = async (
  requestId: number,
  payload: CreateDocumentAiRequestPublicLinkInput,
  currentUser: { id: number; email: string; role: UserRole }
) => {
  const request = await prisma.documentAiRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requestedByUserId: true,
      status: true
    }
  });

  if (!request) {
    return null;
  }

  const canManage = hasManagementAccess(currentUser.role);
  if (!canManage && request.requestedByUserId !== currentUser.id) {
    return null;
  }

  if (request.status === DocumentAiRequestStatus.CANCELADA) {
    throw new Error("Solicitacao cancelada nao permite gerar link publico.");
  }

  const expiraEm = new Date(Date.now() + payload.validade_dias * 24 * 60 * 60 * 1000);

  await prisma.documentAiRequestPublicLink.updateMany({
    where: {
      requestId,
      ativo: true
    },
    data: {
      ativo: false
    }
  });

  return prisma.documentAiRequestPublicLink.create({
    data: {
      requestId,
      token: randomUUID(),
      ativo: true,
      expiraEm,
      createdByUserId: currentUser.id,
      createdByEmail: currentUser.email
    }
  });
};

export const deactivateDocumentAiRequestPublicLink = async (
  requestId: number,
  currentUser: { id: number; role: UserRole }
) => {
  const request = await prisma.documentAiRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requestedByUserId: true
    }
  });

  if (!request) {
    return null;
  }

  const canManage = hasManagementAccess(currentUser.role);
  if (!canManage && request.requestedByUserId !== currentUser.id) {
    return null;
  }

  const result = await prisma.documentAiRequestPublicLink.updateMany({
    where: {
      requestId,
      ativo: true
    },
    data: {
      ativo: false
    }
  });

  return {
    desativados: result.count
  };
};

export const getActiveDocumentAiRequestPublicLinkByToken = async (token: string) => {
  const link = await prisma.documentAiRequestPublicLink.findFirst({
    where: {
      token,
      ativo: true
    },
    include: {
      request: {
        select: {
          id: true,
          titulo: true,
          descricao: true,
          prazo: true,
          status: true,
          requestedByUserId: true
        }
      }
    }
  });

  if (!link) {
    return null;
  }

  if (link.expiraEm.getTime() < Date.now()) {
    await prisma.documentAiRequestPublicLink.update({
      where: { id: link.id },
      data: { ativo: false }
    });
    return null;
  }

  return link;
};

export const getDocumentAiRequestPublicLinkByToken = async (token: string) => {
  return prisma.documentAiRequestPublicLink.findFirst({
    where: {
      token
    },
    include: {
      request: {
        select: {
          id: true,
          titulo: true,
          descricao: true,
          prazo: true,
          status: true,
          requestedByUserId: true
        }
      }
    }
  });
};

export const fulfillDocumentAiRequestWithUploads = async (
  requestId: number,
  payload: UploadRequestDocumentBody,
  files: Express.Multer.File[],
  currentUser: { id: number; role: UserRole }
) => {
  const existing = await prisma.documentAiRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      titulo: true,
      descricao: true,
      status: true,
      requestedByUserId: true
    }
  });

  if (!existing) {
    return null;
  }

  const canManage = hasManagementAccess(currentUser.role);
  if (!canManage && existing.requestedByUserId !== currentUser.id) {
    return null;
  }

  if (existing.status === DocumentAiRequestStatus.CANCELADA) {
    throw new Error("Solicitacao cancelada.");
  }

  const staged = await stageUploadedFiles(files);

  try {
    return await createDocumentsForRequest({
      requestId: existing.id,
      requestTitle: existing.titulo,
      requestDescription: existing.descricao,
      files: staged,
      createdByUserId: currentUser.id,
      titleOverride: payload.titulo_documento,
      descriptionOverride: payload.descricao_documento,
      fulfilledByUserId: currentUser.id
    });
  } catch (error) {
    await Promise.all(staged.map((item) => fsPromises.unlink(item.filePath).catch(() => undefined)));
    throw error;
  }
};

export const fulfillDocumentAiRequestByPublicToken = async (
  token: string,
  payload: PublicUploadRequestDocumentBody,
  files: Express.Multer.File[]
) => {
  const activeLink = await getActiveDocumentAiRequestPublicLinkByToken(token);
  if (!activeLink) {
    throw new Error("DOCUMENT_AI_REQUEST_LINK_NOT_FOUND");
  }

  if (activeLink.request.status === DocumentAiRequestStatus.CANCELADA) {
    throw new Error("DOCUMENT_AI_REQUEST_CANCELLED");
  }

  const staged = await stageUploadedFiles(files);

  try {
    const result = await createDocumentsForRequest({
      requestId: activeLink.request.id,
      requestTitle: activeLink.request.titulo,
      requestDescription: activeLink.request.descricao,
      files: staged,
      createdByUserId: activeLink.request.requestedByUserId,
      senderName: payload.nome_remetente,
      fulfilledByUserId: null
    });

    await prisma.documentAiRequestPublicLink.update({
      where: { id: activeLink.id },
      data: {
        ativo: false
      }
    });

    return result;
  } catch (error) {
    await Promise.all(staged.map((item) => fsPromises.unlink(item.filePath).catch(() => undefined)));
    throw error;
  }
};
