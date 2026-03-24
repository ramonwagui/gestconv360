import { AuditAction, Prisma, UserRole } from "@prisma/client";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { Router } from "express";
import multer from "multer";
import path from "path";

import { authenticate, authorizeRoles } from "../../middlewares/auth";

import { mapInstrument } from "./instrumentos.mapper";
import {
  alertQuerySchema,
  checklistItemCreateSchema,
  checklistItemIdParamSchema,
  checklistItemUpdateSchema,
  createInstrumentSchema,
  listQuerySchema,
  updateInstrumentSchema
} from "./instrumentos.schema";
import {
  createAuditLog,
  diffChangedFields,
  type AuditSnapshot
} from "../auditoria/auditoria.service";
import {
  createInstrument,
  createChecklistItem,
  deleteChecklistItem,
  getChecklistItemById,
  getChecklistSummary,
  deactivateInstrument,
  getDeadlineAlerts,
  getInstrumentById,
  listChecklistItems,
  listInstruments,
  clearChecklistItemUpload,
  updateChecklistItem,
  updateChecklistItemUpload,
  updateInstrument
} from "./instrumentos.service";

const router = Router();

const uploadRootPath = path.resolve(process.cwd(), "uploads", "instrumentos");
const allowedUploadMimes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedUploadMimes.has(file.mimetype)) {
      cb(new Error("Formato de arquivo nao permitido. Use PDF, DOC, DOCX, JPG ou PNG."));
      return;
    }
    cb(null, true);
  }
});

router.use(authenticate);

const parseDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }
  return new Date(`${value}T00:00:00.000Z`);
};

const validateDateRules = (payload: {
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  data_assinatura?: string | null;
}) => {
  const vigenciaInicio = parseDate(payload.vigencia_inicio ?? null);
  const vigenciaFim = parseDate(payload.vigencia_fim ?? null);
  const dataAssinatura = parseDate(payload.data_assinatura ?? null);

  if (vigenciaInicio && vigenciaFim && vigenciaFim < vigenciaInicio) {
    return {
      ok: false,
      message: "vigencia_fim deve ser maior ou igual a vigencia_inicio"
    };
  }

  if (dataAssinatura) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dataAssinatura > today) {
      return {
        ok: false,
        message: "data_assinatura nao pode ser futura"
      };
    }
  }

  return { ok: true };
};

const snapshotInstrument = (item: Awaited<ReturnType<typeof getInstrumentById>>): AuditSnapshot => {
  if (!item) {
    return {};
  }

  return {
    proposta: item.proposta,
    instrumento: item.instrumento,
    objeto: item.objeto,
    valor_repasse: Number(item.valorRepasse),
    valor_contrapartida: Number(item.valorContrapartida),
    data_cadastro: item.dataCadastro.toISOString().slice(0, 10),
    data_assinatura: item.dataAssinatura ? item.dataAssinatura.toISOString().slice(0, 10) : null,
    vigencia_inicio: item.vigenciaInicio.toISOString().slice(0, 10),
    vigencia_fim: item.vigenciaFim.toISOString().slice(0, 10),
    data_prestacao_contas: item.dataPrestacaoContas
      ? item.dataPrestacaoContas.toISOString().slice(0, 10)
      : null,
    data_dou: item.dataDou ? item.dataDou.toISOString().slice(0, 10) : null,
    concedente: item.concedente,
    convenete_id: item.conveneteId,
    status: item.status,
    responsavel: item.responsavel,
    orgao_executor: item.orgaoExecutor,
    observacoes: item.observacoes,
    ativo: item.ativo
  };
};

const mapChecklistItem = (instrumentId: number, item: Awaited<ReturnType<typeof getChecklistItemById>>) => {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    nome_documento: item.nomeDocumento,
    obrigatorio: item.obrigatorio,
    concluido: item.concluido,
    observacao: item.observacao,
    ordem: item.ordem,
    arquivo:
      item.arquivoPath && item.arquivoNomeOriginal
        ? {
            nome_original: item.arquivoNomeOriginal,
            mime_type: item.arquivoMimeType,
            tamanho: item.arquivoTamanho,
            uploaded_at: item.uploadedAt?.toISOString() ?? null,
            download_path: `/api/v1/instrumentos/${instrumentId}/checklist/${item.id}/download`
          }
        : null,
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString()
  };
};

router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (req, res) => {
  const parsed = createInstrumentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  const dateRules = validateDateRules(parsed.data);
  if (!dateRules.ok) {
    return res.status(422).json({ message: dateRules.message });
  }

  try {
    const created = await createInstrument(parsed.data);
    if (req.user) {
      const afterData = snapshotInstrument(created);
      await createAuditLog({
        instrumentId: created.id,
        userId: req.user.id,
        userEmail: req.user.email,
        action: AuditAction.CREATE,
        afterData,
        changedFields: Object.keys(afterData)
      });
    }
    return res.status(201).json(mapInstrument(created));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Proposta ou instrumento ja cadastrados." });
      }
      if (error.code === "P2003") {
        return res.status(422).json({ message: "Convenete informado nao encontrado." });
      }
      if (error.code === "P2025") {
        return res.status(422).json({ message: "Convenete informado nao encontrado." });
      }
    }
    return res.status(500).json({ message: "Erro interno ao criar registro." });
  }
});

router.get("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Filtros invalidos",
      issues: parsed.error.flatten()
    });
  }

  try {
    const items = await listInstruments(parsed.data);
    return res.json(items.map(mapInstrument));
  } catch {
    return res.status(500).json({ message: "Erro interno ao listar instrumentos." });
  }
});

router.get(
  "/alerts/deadlines",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
  const parsed = alertQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Parametros invalidos",
      issues: parsed.error.flatten()
    });
  }

  try {
    const alerts = await getDeadlineAlerts(parsed.data.limite_dias);
    return res.json(alerts);
  } catch {
    return res.status(500).json({ message: "Erro interno ao listar alertas." });
  }
  }
);

router.get("/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  try {
    const item = await getInstrumentById(id);
    if (!item) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    return res.json(mapInstrument(item));
  } catch {
    return res.status(500).json({ message: "Erro interno ao consultar registro." });
  }
});

router.get(
  "/:id/checklist",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const existing = await getInstrumentById(id);
    if (!existing) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const [items, summary] = await Promise.all([listChecklistItems(id), getChecklistSummary(id)]);
    return res.json({
      resumo: summary,
      itens: items.map((item: Awaited<ReturnType<typeof getChecklistItemById>>) => mapChecklistItem(id, item))
    });
  }
);

router.post("/:id/checklist", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const existing = await getInstrumentById(id);
  if (!existing) {
    return res.status(404).json({ message: "Registro nao encontrado." });
  }

  const parsed = checklistItemCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  const created = await createChecklistItem(id, parsed.data);
  return res.status(201).json(mapChecklistItem(id, created));
});

router.patch("/:id/checklist/:itemId", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const itemParam = checklistItemIdParamSchema.safeParse(req.params);
  if (!itemParam.success) {
    return res.status(400).json({ message: "Item invalido." });
  }

  const parsed = checklistItemUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const updated = await updateChecklistItem(id, itemParam.data.itemId, parsed.data);
    return res.json(mapChecklistItem(id, updated));
  } catch (error) {
    if (error instanceof Error && error.message === "CHECKLIST_ITEM_NOT_FOUND") {
      return res.status(404).json({ message: "Item de checklist nao encontrado." });
    }
    return res.status(500).json({ message: "Erro interno ao atualizar item do checklist." });
  }
});

router.delete("/:id/checklist/:itemId", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const itemParam = checklistItemIdParamSchema.safeParse(req.params);
  if (!itemParam.success) {
    return res.status(400).json({ message: "Item invalido." });
  }

  try {
    const existing = await getChecklistItemById(id, itemParam.data.itemId);
    if (!existing) {
      return res.status(404).json({ message: "Item de checklist nao encontrado." });
    }

    if (existing.arquivoPath) {
      await fs.unlink(existing.arquivoPath).catch(() => undefined);
    }

    await deleteChecklistItem(id, itemParam.data.itemId);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Erro interno ao remover item do checklist." });
  }
});

router.post(
  "/:id/checklist/:itemId/upload",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR),
  upload.single("arquivo"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    if (!req.file) {
      return res.status(422).json({ message: "Arquivo nao enviado." });
    }

    const existing = await getChecklistItemById(id, itemParam.data.itemId);
    if (!existing) {
      return res.status(404).json({ message: "Item de checklist nao encontrado." });
    }

    await fs.mkdir(uploadRootPath, { recursive: true });
    const extension = path.extname(req.file.originalname).toLowerCase();
    const safeName = `${id}-${itemParam.data.itemId}-${Date.now()}-${randomUUID()}${extension}`;
    const destination = path.join(uploadRootPath, safeName);

    await fs.writeFile(destination, req.file.buffer);
    if (existing.arquivoPath) {
      await fs.unlink(existing.arquivoPath).catch(() => undefined);
    }

    const updated = await updateChecklistItemUpload(id, itemParam.data.itemId, {
      arquivoPath: destination,
      arquivoNomeOriginal: req.file.originalname,
      arquivoMimeType: req.file.mimetype,
      arquivoTamanho: req.file.size
    });

    return res.json(mapChecklistItem(id, updated));
  }
);

router.delete(
  "/:id/checklist/:itemId/upload",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    const existing = await getChecklistItemById(id, itemParam.data.itemId);
    if (!existing) {
      return res.status(404).json({ message: "Item de checklist nao encontrado." });
    }

    if (existing.arquivoPath) {
      await fs.unlink(existing.arquivoPath).catch(() => undefined);
    }

    const updated = await clearChecklistItemUpload(id, itemParam.data.itemId);
    return res.json(mapChecklistItem(id, updated));
  }
);

router.get(
  "/:id/checklist/:itemId/download",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID invalido." });
    }

    const itemParam = checklistItemIdParamSchema.safeParse(req.params);
    if (!itemParam.success) {
      return res.status(400).json({ message: "Item invalido." });
    }

    const item = await getChecklistItemById(id, itemParam.data.itemId);
    if (!item || !item.arquivoPath || !item.arquivoNomeOriginal) {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }

    try {
      await fs.access(item.arquivoPath);
      return res.download(item.arquivoPath, item.arquivoNomeOriginal);
    } catch {
      return res.status(404).json({ message: "Arquivo nao encontrado." });
    }
  }
);

router.put("/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsed = updateInstrumentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const existing = await getInstrumentById(id);
    if (!existing) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const mergedDates = {
      vigencia_inicio: parsed.data.vigencia_inicio ?? existing.vigenciaInicio.toISOString().slice(0, 10),
      vigencia_fim: parsed.data.vigencia_fim ?? existing.vigenciaFim.toISOString().slice(0, 10),
      data_assinatura:
        parsed.data.data_assinatura ??
        (existing.dataAssinatura ? existing.dataAssinatura.toISOString().slice(0, 10) : null)
    };

    const dateRules = validateDateRules(mergedDates);
    if (!dateRules.ok) {
      return res.status(422).json({ message: dateRules.message });
    }

    if (parsed.data.status === "EM_EXECUCAO") {
      const checklistSummary = await getChecklistSummary(id);
      if (!checklistSummary.pode_iniciar_execucao) {
        return res.status(422).json({
          message:
            checklistSummary.obrigatorios === 0
              ? "Checklist de celebracao ainda nao foi configurado."
              : `Checklist pendente: ${checklistSummary.pendentes_obrigatorios.join(", ")}`
        });
      }
    }

    const beforeData = snapshotInstrument(existing);
    const updated = await updateInstrument(id, parsed.data);
    if (req.user) {
      const afterData = snapshotInstrument(updated);
      await createAuditLog({
        instrumentId: id,
        userId: req.user.id,
        userEmail: req.user.email,
        action: AuditAction.UPDATE,
        beforeData,
        afterData,
        changedFields: diffChangedFields(beforeData, afterData)
      });
    }
    return res.json(mapInstrument(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return res.status(409).json({ message: "Proposta ou instrumento ja cadastrados." });
      }
      if (error.code === "P2025") {
        return res.status(404).json({ message: "Registro nao encontrado." });
      }
      if (error.code === "P2003") {
        return res.status(422).json({ message: "Convenete informado nao encontrado." });
      }
    }
    return res.status(500).json({ message: "Erro interno ao atualizar registro." });
  }
});

router.delete("/:id", authorizeRoles(UserRole.ADMIN), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  try {
    const existing = await getInstrumentById(id);
    if (!existing) {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }

    const beforeData = snapshotInstrument(existing);
    const updated = await deactivateInstrument(id);

    if (req.user) {
      const afterData = snapshotInstrument(updated);
      await createAuditLog({
        instrumentId: id,
        userId: req.user.id,
        userEmail: req.user.email,
        action: AuditAction.DEACTIVATE,
        beforeData,
        afterData,
        changedFields: diffChangedFields(beforeData, afterData)
      });
    }

    return res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Registro nao encontrado." });
    }
    return res.status(500).json({ message: "Erro interno ao excluir registro." });
  }
});

export { router as instrumentosRouter };
