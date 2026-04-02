import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { assistentePerguntaBodySchema } from "./assistente.schema";
import { responderPerguntaAssistente } from "./assistente.service";

export const assistenteRouter = Router();

assistenteRouter.use(authenticate);

assistenteRouter.post(
  "/perguntar",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = assistentePerguntaBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await responderPerguntaAssistente(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao processar pergunta do assistente."
      });
    }
  }
);
