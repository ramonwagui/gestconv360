import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { buildObraReport, buildRepasseReport } from "./relatorios.service";
import { obraReportQuerySchema, repasseReportQuerySchema } from "./relatorios.schema";

export const relatoriosRouter = Router();

const normalizeProponenteAlias = <T extends Record<string, unknown>>(payload: T) => {
  const next = { ...payload } as Record<string, unknown>;
  const conveneteId = next.convenete_id;
  const proponenteId = next.proponente_id;

  if ((conveneteId === undefined || conveneteId === null || conveneteId === "") && proponenteId !== undefined) {
    next.convenete_id = proponenteId;
  }

  return next as T;
};

relatoriosRouter.use(authenticate);

relatoriosRouter.get(
  "/repasses",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = repasseReportQuerySchema.safeParse(normalizeProponenteAlias(req.query as Record<string, unknown>));
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    const report = await buildRepasseReport(parsed.data);
    if (!report) {
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }

    return res.json(report);
  }
);

relatoriosRouter.get(
  "/obras",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = obraReportQuerySchema.safeParse(normalizeProponenteAlias(req.query as Record<string, unknown>));
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    const report = await buildObraReport(parsed.data);
    return res.json(report);
  }
);
