import { randomUUID } from "crypto";
import fs from "fs";
import { promises as fsPromises } from "fs";
import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import path from "path";
import { authenticate } from "../../middlewares/auth";
import { prisma } from "../../lib/prisma";
import { DocumentStatus } from "@prisma/client";
import {
  answerDocumentQuestion,
  classifyDocumentById,
  getDocumentIndexStatus,
  injectOcrTextForDocument,
  queueDocumentIndexation,
  reindexDocument,
  searchDocumentContent,
  searchDocumentContentSemantic
} from "./documents-intelligence.service";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "documents");
const DOCUMENT_MAX_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_PDF_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: DOCUMENT_MAX_SIZE_BYTES }
});

const ensureUploadDir = async () => {
  await fsPromises.mkdir(UPLOAD_DIR, { recursive: true });
};

const isPdfBuffer = (buffer: Buffer) => {
  if (!buffer || buffer.length < 5) {
    return false;
  }

  const sniffWindowSize = Math.min(buffer.length, 1024);
  const sniffWindow = buffer.subarray(0, sniffWindowSize).toString("ascii");
  return sniffWindow.includes("%PDF-");
};

const uploadDocumentMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single("arquivo")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "Arquivo muito grande. Limite de 20MB." });
      return;
    }

    res.status(400).json({ message: error.message || "Falha ao processar upload do arquivo" });
  });
};

export const documentsRouter = Router();
documentsRouter.use(authenticate);

documentsRouter.post("/", uploadDocumentMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não identificado" });
    }

    const titulo = String(req.body?.titulo ?? "");
    const descricao = String(req.body?.descricao ?? "");
    const arquivo = typeof req.body?.arquivo === "string" ? req.body.arquivo : "";
    const arquivo_nome = String(req.body?.arquivo_nome ?? "").trim();
    const uploadedFile = req.file;

    console.info("[documents] Iniciando upload", {
      userId,
      titulo,
      arquivoNomeBody: arquivo_nome,
      hasMultipartFile: Boolean(uploadedFile),
      multipartOriginalname: uploadedFile?.originalname,
      multipartMimetype: uploadedFile?.mimetype,
      multipartSize: uploadedFile?.size
    });

    if (!titulo.trim()) {
      return res.status(400).json({ message: "Título é obrigatório" });
    }

    if (!uploadedFile && !arquivo) {
      return res.status(400).json({ message: "Arquivo é obrigatório" });
    }

    if (!uploadedFile && !arquivo_nome) {
      return res.status(400).json({ message: "Nome do arquivo é obrigatório" });
    }

    let buffer: Buffer;
    let arquivoNomeFinal = arquivo_nome;

    if (uploadedFile) {
      const hasAllowedMime = ALLOWED_PDF_MIME_TYPES.has((uploadedFile.mimetype || "").toLowerCase());
      const hasPdfSignature = isPdfBuffer(uploadedFile.buffer);
      if (!hasAllowedMime && !hasPdfSignature) {
        console.warn("[documents] Upload rejeitado por tipo invalido", {
          mimetype: uploadedFile.mimetype,
          originalname: uploadedFile.originalname,
          size: uploadedFile.size
        });
        return res.status(422).json({ message: "Formato de arquivo inválido. Envie um PDF." });
      }

      buffer = uploadedFile.buffer;
      arquivoNomeFinal = uploadedFile.originalname || arquivo_nome;
    } else {
      let base64Data = arquivo;
      if (arquivo.startsWith("data:")) {
        const splitData = arquivo.split(",");
        base64Data = splitData[1] || "";
      }

      if (!base64Data.trim()) {
        return res.status(400).json({ message: "Arquivo inválido" });
      }

      try {
        buffer = Buffer.from(base64Data, "base64");
      } catch {
        return res.status(400).json({ message: "Arquivo inválido" });
      }
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ message: "Arquivo inválido" });
    }

    if (!isPdfBuffer(buffer)) {
      console.warn("[documents] Upload rejeitado por assinatura PDF ausente", {
        arquivoNome: arquivoNomeFinal,
        size: buffer.length
      });
      return res.status(422).json({ message: "Formato de arquivo inválido. Envie um PDF." });
    }

    if (!arquivoNomeFinal) {
      return res.status(400).json({ message: "Nome do arquivo é obrigatório" });
    }

    await ensureUploadDir();

    const arquivoPath = path.join(UPLOAD_DIR, `${Date.now()}-${randomUUID()}.pdf`);
    await fsPromises.writeFile(arquivoPath, buffer);

    let documento;

    try {
      documento = await prisma.document.create({
        data: {
          titulo,
          descricao: descricao || null,
          arquivoPath,
          arquivoNome: arquivoNomeFinal,
          status: DocumentStatus.PENDENTE,
          createdByUserId: userId
        }
      });
    } catch (error) {
      await fsPromises.unlink(arquivoPath).catch(() => undefined);
      throw error;
    }

    queueDocumentIndexation(documento.id);

    return res.status(201).json({
      id: documento.id,
      titulo: documento.titulo,
      descricao: documento.descricao,
      arquivoNome: documento.arquivoNome,
      status: documento.status,
      indexStatus: documento.indexStatus,
      aiCategory: documento.aiCategory,
      aiRiskLevel: documento.aiRiskLevel,
      aiClassificationConfidence: documento.aiClassificationConfidence,
      aiInsights: documento.aiInsights,
      createdAt: documento.createdAt.toISOString()
    });
  } catch (error: any) {
    console.error("[documents] Error:", error);
    return res.status(400).json({
      message: error.message || "Falha ao criar documento"
    });
  }
});

documentsRouter.get("/search", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      return res.status(400).json({ message: "Informe o termo de busca em q." });
    }

    const statusRaw = String(req.query.status ?? "").trim();
    const status = statusRaw ? (statusRaw as DocumentStatus) : undefined;
    if (status && !Object.values(DocumentStatus).includes(status)) {
      return res.status(400).json({ message: "Status de documento invalido." });
    }

    const createdByRaw = String(req.query.created_by_user_id ?? "").trim();
    const createdByUserId = createdByRaw ? Number(createdByRaw) : undefined;
    if (createdByRaw && (!Number.isInteger(createdByUserId) || Number(createdByUserId) <= 0)) {
      return res.status(400).json({ message: "created_by_user_id invalido." });
    }

    const dataDe = String(req.query.data_de ?? "").trim() || undefined;
    const dataAte = String(req.query.data_ate ?? "").trim() || undefined;
    const limitRaw = String(req.query.limit ?? "").trim();
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const results = await searchDocumentContent({
      q,
      status,
      createdByUserId,
      dataDe,
      dataAte,
      limit
    });

    return res.json({
      query: q,
      total: results.length,
      resultados: results
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Falha ao pesquisar documentos." });
  }
});

documentsRouter.get("/search-semantic", async (req, res) => {
  try {
    const q = String(req.query.q ?? "").trim();
    if (!q) {
      return res.status(400).json({ message: "Informe o termo de busca em q." });
    }

    const statusRaw = String(req.query.status ?? "").trim();
    const status = statusRaw ? (statusRaw as DocumentStatus) : undefined;
    if (status && !Object.values(DocumentStatus).includes(status)) {
      return res.status(400).json({ message: "Status de documento invalido." });
    }

    const createdByRaw = String(req.query.created_by_user_id ?? "").trim();
    const createdByUserId = createdByRaw ? Number(createdByRaw) : undefined;
    if (createdByRaw && (!Number.isInteger(createdByUserId) || Number(createdByUserId) <= 0)) {
      return res.status(400).json({ message: "created_by_user_id invalido." });
    }

    const dataDe = String(req.query.data_de ?? "").trim() || undefined;
    const dataAte = String(req.query.data_ate ?? "").trim() || undefined;
    const limitRaw = String(req.query.limit ?? "").trim();
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const results = await searchDocumentContentSemantic({
      q,
      status,
      createdByUserId,
      dataDe,
      dataAte,
      limit
    });

    return res.json({
      query: q,
      total: results.length,
      resultados: results
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Falha ao pesquisar documentos semanticamente." });
  }
});

documentsRouter.get("/", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (status) where.status = status;

    const documentos = await prisma.document.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, nome: true, email: true } },
        signatures: {
          include: {
            certificate: { select: { id: true, nome: true, titular: true } },
            signedByUser: { select: { id: true, nome: true, email: true } }
          },
          orderBy: { signedAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const total = await prisma.document.count({ where });

    return res.json({
      documentos: documentos.map((doc) => ({
        id: doc.id,
        titulo: doc.titulo,
        descricao: doc.descricao,
        arquivoNome: doc.arquivoNome,
        status: doc.status,
        indexStatus: doc.indexStatus,
        indexedAt: doc.indexedAt?.toISOString() ?? null,
        indexError: doc.indexError,
        aiSummary: doc.aiSummary,
        aiKeywords: doc.aiKeywords,
        aiCategory: doc.aiCategory,
        aiRiskLevel: doc.aiRiskLevel,
        aiClassificationConfidence: doc.aiClassificationConfidence,
        aiInsights: doc.aiInsights,
        createdAt: doc.createdAt.toISOString(),
        criado_por: doc.createdByUser,
        assinaturas: doc.signatures.map((sig) => ({
          id: sig.id,
          certificado: sig.certificate,
          assinado_em: sig.signedAt.toISOString(),
          assinante: sig.signedByUser
        }))
      })),
      total
    });
  } catch (error: any) {
    console.error("[documents] List error:", error.message);
    return res.status(500).json({ message: "Falha ao listar documentos" });
  }
});

documentsRouter.get("/pendentes", async (_req, res) => {
  try {
    const documentos = await prisma.document.findMany({
      where: { status: DocumentStatus.PENDENTE },
      select: {
        id: true,
        titulo: true,
        arquivoNome: true,
        createdAt: true,
        createdByUser: { select: { id: true, nome: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return res.json(documentos);
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao buscar documentos pendentes" });
  }
});

documentsRouter.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const documento = await prisma.document.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, nome: true, email: true } },
        signatures: {
          include: {
            certificate: { select: { id: true, nome: true, titular: true, cpf: true } },
            signedByUser: { select: { id: true, nome: true, email: true } }
          },
          orderBy: { signedAt: "desc" }
        }
      }
    });

    if (!documento) {
      return res.status(404).json({ message: "Documento não encontrado" });
    }

    return res.json({
      id: documento.id,
      titulo: documento.titulo,
      descricao: documento.descricao,
      arquivoNome: documento.arquivoNome,
      status: documento.status,
      indexStatus: documento.indexStatus,
      indexedAt: documento.indexedAt?.toISOString() ?? null,
      indexError: documento.indexError,
      aiSummary: documento.aiSummary,
      aiKeywords: documento.aiKeywords,
      aiCategory: documento.aiCategory,
      aiRiskLevel: documento.aiRiskLevel,
      aiClassificationConfidence: documento.aiClassificationConfidence,
      aiInsights: documento.aiInsights,
      createdAt: documento.createdAt.toISOString(),
      criado_por: documento.createdByUser,
      assinaturas: documento.signatures.map((sig) => ({
        id: sig.id,
        certificado: sig.certificate,
        assinado_em: sig.signedAt.toISOString(),
        assinante: sig.signedByUser
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao buscar documento" });
  }
});

documentsRouter.get("/:id/index-status", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID de documento invalido." });
    }

    const indexInfo = await getDocumentIndexStatus(id);
    if (!indexInfo) {
      return res.status(404).json({ message: "Documento nao encontrado." });
    }

    return res.json({
      id: indexInfo.id,
      indexStatus: indexInfo.indexStatus,
      indexedAt: indexInfo.indexedAt?.toISOString() ?? null,
      indexError: indexInfo.indexError,
      aiSummary: indexInfo.aiSummary,
      aiKeywords: indexInfo.aiKeywords,
      aiCategory: indexInfo.aiCategory,
      aiRiskLevel: indexInfo.aiRiskLevel,
      aiClassificationConfidence: indexInfo.aiClassificationConfidence,
      aiInsights: indexInfo.aiInsights
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Falha ao consultar status de indexacao." });
  }
});

documentsRouter.post("/:id/reindex", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID de documento invalido." });
    }

    const queued = await reindexDocument(id);
    if (!queued) {
      return res.status(404).json({ message: "Documento nao encontrado." });
    }

    return res.json({ message: "Reindexacao agendada com sucesso." });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Falha ao reindexar documento." });
  }
});

documentsRouter.post("/:id/ask", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID de documento invalido." });
    }

    const pergunta = String(req.body?.pergunta ?? "").trim();
    if (pergunta.length < 3) {
      return res.status(400).json({ message: "Informe uma pergunta com pelo menos 3 caracteres." });
    }

    const result = await answerDocumentQuestion(id, pergunta);
    return res.json(result);
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Falha ao responder pergunta do documento." });
  }
});

documentsRouter.post("/:id/classify", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID de documento invalido." });
    }

    const ok = await classifyDocumentById(id);
    if (!ok) {
      return res.status(404).json({ message: "Documento nao encontrado." });
    }

    return res.json({ message: "Classificacao IA atualizada com sucesso." });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Falha ao classificar documento." });
  }
});

documentsRouter.post("/:id/ocr-text", async (req, res) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID de documento invalido." });
    }

    const texto = String(req.body?.texto ?? "").trim();
    if (texto.length < 30) {
      return res.status(400).json({ message: "Texto OCR muito curto. Informe ao menos 30 caracteres." });
    }

    const ok = await injectOcrTextForDocument(id, texto);
    if (!ok) {
      return res.status(404).json({ message: "Documento nao encontrado." });
    }

    return res.json({ message: "Texto OCR aplicado e documento reindexado." });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Falha ao aplicar texto OCR." });
  }
});

documentsRouter.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const userId = req.user?.id;
    
    const doc = await prisma.document.findUnique({
      where: { id },
      select: { createdByUserId: true, signatures: { select: { id: true } } }
    });

    if (!doc) {
      return res.status(404).json({ message: "Documento não encontrado" });
    }

    if (doc.signatures.length > 0) {
      return res.status(400).json({ message: "Não é possível excluir documento já assinado" });
    }

    const documento = await prisma.document.findUnique({ where: { id }, select: { arquivoPath: true } });
    if (documento?.arquivoPath && fs.existsSync(documento.arquivoPath)) {
      fs.unlinkSync(documento.arquivoPath);
    }

    await prisma.document.delete({ where: { id } });
    return res.json({ message: "Documento excluído com sucesso" });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Falha ao excluir documento" });
  }
});

documentsRouter.get("/:id/download", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const documento = await prisma.document.findUnique({ where: { id } });

    if (!documento) {
      return res.status(404).json({ message: "Documento não encontrado" });
    }

    let filePath = documento.arquivoPath;

    if (documento.status === "ASSINADO" && fs.existsSync(documento.arquivoPath.replace(".pdf", "-assinado.pdf"))) {
      filePath = documento.arquivoPath.replace(".pdf", "-assinado.pdf");
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${documento.arquivoNome}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    return res.status(500).json({ message: "Falha ao baixar documento" });
  }
});
