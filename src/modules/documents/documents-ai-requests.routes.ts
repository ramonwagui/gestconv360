import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";

import { authenticate } from "../../middlewares/auth";
import {
  createDocumentAiRequestPublicLinkSchema,
  createDocumentAiRequestSchema,
  listDocumentAiRequestsQuerySchema,
  requestIdParamSchema,
  updateDocumentAiRequestSchema,
  uploadRequestDocumentBodySchema
} from "./documents-ai-requests.schema";
import {
  createDocumentAiRequestPublicLink,
  deactivateDocumentAiRequestPublicLink,
  createDocumentAiRequest,
  fulfillDocumentAiRequestWithUploads,
  getDocumentAiRequestById,
  listDocumentAiRequests,
  updateDocumentAiRequest
} from "./documents-ai-requests.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const uploadDocumentMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.array("arquivos", 20)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "Arquivo muito grande. Limite de 20MB." });
      return;
    }

    res.status(400).json({ message: error.message || "Falha ao processar upload do arquivo." });
  });
};

export const documentAiRequestsRouter = Router();

documentAiRequestsRouter.use(authenticate);

documentAiRequestsRouter.post("/", async (req, res) => {
  const parsed = createDocumentAiRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({ message: "Payload invalido.", issues: parsed.error.flatten() });
  }

  if (!req.user?.id || !req.user.role) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const created = await createDocumentAiRequest(parsed.data, req.user.id);
  return res.status(201).json(created);
});

documentAiRequestsRouter.get("/", async (req, res) => {
  if (!req.user?.id || !req.user.role) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const parsed = listDocumentAiRequestsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ message: "Parametros de consulta invalidos.", issues: parsed.error.flatten() });
  }

  const result = await listDocumentAiRequests(parsed.data, { id: req.user.id, role: req.user.role });
  return res.json(result);
});

documentAiRequestsRouter.get("/:id", async (req, res) => {
  if (!req.user?.id || !req.user.role) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const parsed = requestIdParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const item = await getDocumentAiRequestById(parsed.data.id, { id: req.user.id, role: req.user.role });
  if (!item) {
    return res.status(404).json({ message: "Solicitacao nao encontrada." });
  }

  return res.json(item);
});

documentAiRequestsRouter.patch("/:id", async (req, res) => {
  if (!req.user?.id || !req.user.role) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const parsedId = requestIdParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsedBody = updateDocumentAiRequestSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(422).json({ message: "Payload invalido.", issues: parsedBody.error.flatten() });
  }

  try {
    const updated = await updateDocumentAiRequest(parsedId.data.id, parsedBody.data, {
      id: req.user.id,
      role: req.user.role
    });
    if (!updated) {
      return res.status(404).json({ message: "Solicitacao nao encontrada." });
    }

    return res.json(updated);
  } catch (error) {
    return res.status(422).json({ message: error instanceof Error ? error.message : "Falha ao atualizar solicitacao." });
  }
});

const buildAbsoluteUrl = (req: Request, pathValue: string) => {
  const host = req.get("host");
  const protocol = req.protocol;
  if (!host) {
    return pathValue;
  }
  if (pathValue.startsWith("http://") || pathValue.startsWith("https://")) {
    return pathValue;
  }
  const normalizedPath = pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
  return `${protocol}://${host}${normalizedPath}`;
};

documentAiRequestsRouter.post("/:id/public-link", async (req, res) => {
  if (!req.user?.id || !req.user.role || !req.user.email) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const parsedId = requestIdParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsedBody = createDocumentAiRequestPublicLinkSchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    return res.status(422).json({ message: "Payload invalido.", issues: parsedBody.error.flatten() });
  }

  try {
    const created = await createDocumentAiRequestPublicLink(parsedId.data.id, parsedBody.data, {
      id: req.user.id,
      role: req.user.role,
      email: req.user.email
    });

    if (!created) {
      return res.status(404).json({ message: "Solicitacao nao encontrada." });
    }

    const publicPath = `/api/v1/public/document-ai-requests/${created.token}`;
    return res.status(201).json({
      token: created.token,
      ativo: created.ativo,
      expira_em: created.expiraEm.toISOString(),
      validade_dias: parsedBody.data.validade_dias,
      link_publico: buildAbsoluteUrl(req, publicPath)
    });
  } catch (error) {
    return res.status(422).json({ message: error instanceof Error ? error.message : "Falha ao gerar link publico." });
  }
});

documentAiRequestsRouter.delete("/:id/public-link", async (req, res) => {
  if (!req.user?.id || !req.user.role) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const parsedId = requestIdParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const result = await deactivateDocumentAiRequestPublicLink(parsedId.data.id, {
    id: req.user.id,
    role: req.user.role
  });

  if (!result) {
    return res.status(404).json({ message: "Solicitacao nao encontrada." });
  }

  return res.json({
    message: result.desativados > 0 ? "Link publico desativado." : "Nenhum link publico ativo para desativar.",
    desativados: result.desativados
  });
});

documentAiRequestsRouter.post("/:id/upload", uploadDocumentMiddleware, async (req, res) => {
  if (!req.user?.id || !req.user.role) {
    return res.status(401).json({ message: "Usuario nao autenticado." });
  }

  const parsedId = requestIdParamSchema.safeParse(req.params);
  if (!parsedId.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsedBody = uploadRequestDocumentBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(422).json({ message: "Payload invalido.", issues: parsedBody.error.flatten() });
  }

  const uploadedFiles = ((req.files as Express.Multer.File[] | undefined) ?? []).filter(
    (file) => file.fieldname === "arquivos"
  );
  if (uploadedFiles.length === 0) {
    return res.status(400).json({ message: "Envie pelo menos um arquivo PDF em 'arquivos'." });
  }

  try {
    const result = await fulfillDocumentAiRequestWithUploads(parsedId.data.id, parsedBody.data, uploadedFiles, {
      id: req.user.id,
      role: req.user.role
    });
    if (!result) {
      return res.status(404).json({ message: "Solicitacao nao encontrada." });
    }

    return res.status(201).json(result);
  } catch (error) {
    return res.status(422).json({ message: error instanceof Error ? error.message : "Falha ao anexar arquivo." });
  }
});
