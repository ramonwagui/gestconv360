import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { getEmailIngestionOverview, runGmailTicketIngestion } from "./tickets-email.service";

export const ticketsEmailRouter = Router();

ticketsEmailRouter.use(authenticate);
ticketsEmailRouter.use(authorizeRoles(UserRole.ADMIN));

ticketsEmailRouter.get("/status", async (_req, res) => {
  const overview = await getEmailIngestionOverview();
  return res.json(overview);
});

ticketsEmailRouter.post("/sync", async (_req, res) => {
  try {
    const result = await runGmailTicketIngestion();
    return res.json({
      message: "Sincronizacao de tickets por email executada.",
      result
    });
  } catch (error) {
    return res.status(422).json({
      message: error instanceof Error ? error.message : "Falha ao sincronizar caixa de email."
    });
  }
});
