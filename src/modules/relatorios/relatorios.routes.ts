import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { buildRepasseReport } from "./relatorios.service";
import { repasseReportQuerySchema } from "./relatorios.schema";

export const relatoriosRouter = Router();

relatoriosRouter.use(authenticate);

relatoriosRouter.get(
  "/repasses",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = repasseReportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    const report = await buildRepasseReport(parsed.data);
    if (!report) {
      return res.status(404).json({ message: "Convenete nao encontrado." });
    }

    return res.json(report);
  }
);
