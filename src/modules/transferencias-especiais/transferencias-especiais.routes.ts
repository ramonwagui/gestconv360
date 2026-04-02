import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { planoAcaoEspecialQuerySchema } from "./transferencias-especiais.schema";
import { listarPlanosAcaoEspeciais } from "./transferencias-especiais.service";

export const transferenciasEspeciaisRouter = Router();

transferenciasEspeciaisRouter.use(authenticate);

transferenciasEspeciaisRouter.get(
  "/plano-acao",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = planoAcaoEspecialQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarPlanosAcaoEspeciais(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao consultar dados de transferencias especiais."
      });
    }
  }
);
