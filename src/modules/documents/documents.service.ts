import { prisma } from "../../lib/prisma";
import { DocumentStatus } from "@prisma/client";

const UPLOAD_DIR = "./uploads/documents";

const ensureUploadDir = () => {
  const fs = require("fs");
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

export const createDocument = async (
  data: {
    titulo: string;
    descricao?: string;
    arquivoBase64: string;
    arquivoNome: string;
  },
  userId: number
) => {
  ensureUploadDir();

  try {
    const ext = data.arquivoNome.split(".").pop()?.toLowerCase() || "pdf";
    const arquivoPath = `${UPLOAD_DIR}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`;

    const fs = require("fs");
    
    let buffer: Buffer;
    try {
      buffer = Buffer.from(data.arquivoBase64, "base64");
    } catch (err) {
      throw new Error("Arquivo base64 invalido");
    }

    if (buffer.length === 0) {
      throw new Error("Arquivo vazio");
    }

    fs.writeFileSync(arquivoPath, buffer);

    return prisma.document.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao || null,
        arquivoPath,
        arquivoNome: data.arquivoNome,
        status: DocumentStatus.PENDENTE,
        createdByUserId: userId
      }
    });
  } catch (error) {
    console.error("[createDocument] Error:", error);
    throw error;
  }
};

export const listDocuments = async (userId: number, options?: {
  status?: DocumentStatus;
  limit?: number;
  offset?: number;
}) => {
  const where: any = {};
  
  if (options?.status) {
    where.status = options.status;
  }

  const documentos = await prisma.document.findMany({
    where,
    include: {
      createdByUser: {
        select: { id: true, nome: true, email: true }
      },
      signatures: {
        include: {
          certificate: {
            select: { id: true, nome: true, titular: true }
          },
          signedByUser: {
            select: { id: true, nome: true, email: true }
          }
        },
        orderBy: { signedAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0
  });

  const total = await prisma.document.count({ where });

  return { documentos, total };
};

export const getDocumentById = async (id: number) => {
  return prisma.document.findUnique({
    where: { id },
    include: {
      createdByUser: {
        select: { id: true, nome: true, email: true }
      },
      signatures: {
        include: {
          certificate: {
            select: { id: true, nome: true, titular: true, cpf: true }
          },
          signedByUser: {
            select: { id: true, nome: true, email: true }
          }
        },
        orderBy: { signedAt: "desc" }
      }
    }
  });
};

export const markDocumentAsSigned = async (id: number) => {
  return prisma.document.update({
    where: { id },
    data: { status: DocumentStatus.ASSINADO }
  });
};

export const getDocumentPath = async (id: number): Promise<string | null> => {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { arquivoPath: true, arquivoNome: true, status: true }
  });
  return doc?.arquivoPath ?? null;
};

export const deleteDocument = async (id: number, userId: number) => {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { arquivoPath: true, createdByUserId: true, signatures: { select: { id: true } } }
  });

  if (!doc) {
    throw new Error("Documento nao encontrado");
  }

  if (doc.signatures.length > 0) {
    throw new Error("Nao e possivel excluir documento ja assinado");
  }

  const fs = require("fs");
  if (fs.existsSync(doc.arquivoPath)) {
    fs.unlinkSync(doc.arquivoPath);
  }

  return prisma.document.delete({
    where: { id }
  });
};

export const getPendingDocuments = async () => {
  return prisma.document.findMany({
    where: { status: DocumentStatus.PENDENTE },
    select: {
      id: true,
      titulo: true,
      arquivoNome: true,
      createdAt: true,
      createdByUser: {
        select: { id: true, nome: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });
};
