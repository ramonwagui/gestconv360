import "express-async-errors";
import "./config/env";
import cors from "cors";
import express, { ErrorRequestHandler, RequestHandler } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { authRouter } from "./modules/auth/auth.routes";
import { auditoriaRouter } from "./modules/auditoria/auditoria.routes";
import { certificatesRouter } from "./modules/certificates/certificates.routes";
import { convenetesRouter } from "./modules/convenetes/convenetes.routes";
import { documentsRouter } from "./modules/documents/documents.routes";
import { documentAiRequestsRouter } from "./modules/documents/documents-ai-requests.routes";
import { documentsPublicRouter } from "./modules/documents/documents.public.routes";
import { instrumentosRouter } from "./modules/instrumentos/instrumentos.routes";
import { instrumentosPublicRouter } from "./modules/instrumentos/instrumentos.public.routes";
import { relatoriosRouter } from "./modules/relatorios/relatorios.routes";
import { signatureRouter } from "./modules/signature/signature.routes";
import { solicitacaoCaixaRouter } from "./modules/solicitacao-caixa/solicitacao-caixa.routes";
import { ticketsEmailRouter } from "./modules/tickets-email/tickets-email.routes";
import { ticketsRouter } from "./modules/tickets/tickets.routes";
import { transferenciasDiscricionariasRouter } from "./modules/transferencias-discricionarias/transferencias-discricionarias.routes";
import { transferenciasEspeciaisRouter } from "./modules/transferencias-especiais/transferencias-especiais.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";

export const app = express();

const convenetesAliasDeprecationMiddleware: RequestHandler = (_req, res, next) => {
  res.setHeader("Deprecation", "true");
  res.setHeader("Sunset", "Wed, 31 Dec 2026 23:59:59 GMT");
  res.setHeader("Link", '</api/v1/proponentes>; rel="successor-version"');
  res.setHeader("X-API-Deprecated-Route", "/api/v1/convenetes");
  next();
};

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gestconv360 API</title>
  </head>
  <body>
    <h1>Gestconv360 API</h1>
    <p>Servidor ativo.</p>
    <ul>
      <li><a href="/health">GET /health</a></li>
      <li><code>/api/v1/auth</code></li>
      <li><code>/api/v1/instrumentos</code></li>
      <li><code>/api/v1/proponentes</code></li>
      <li><code>/api/v1/convenetes</code> (deprecated - use <code>/api/v1/proponentes</code>)</li>
      <li><code>/api/v1/usuarios</code></li>
      <li><code>/api/v1/tickets</code></li>
      <li><code>/api/v1/tickets-email</code></li>
    </ul>
  </body>
</html>`);
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    version: process.env.npm_package_version ?? "unknown",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/public", instrumentosPublicRouter);
app.use("/api/v1/public", documentsPublicRouter);
app.use("/api/v1/instrumentos", instrumentosRouter);
app.use("/api/v1/auditoria", auditoriaRouter);
app.use("/api/v1/proponentes", convenetesRouter);
app.use("/api/v1/convenetes", convenetesAliasDeprecationMiddleware, convenetesRouter);
app.use("/api/v1/relatorios", relatoriosRouter);
app.use("/api/v1/usuarios", usuariosRouter);
app.use("/api/v1/tickets", ticketsRouter);
app.use("/api/v1/tickets-email", ticketsEmailRouter);
app.use("/api/v1/documents/ai-requests", documentAiRequestsRouter);
app.use("/api/v1/documents", documentsRouter);
app.use("/api/v1/certificates", certificatesRouter);
app.use("/api/v1/signature", signatureRouter);
app.use("/api/v1/solicitacao-caixa", solicitacaoCaixaRouter);
app.use("/api/v1/solicitacoes-caixa", solicitacaoCaixaRouter);
app.use("/api/v1/transferencias-especiais", transferenciasEspeciaisRouter);
app.use("/api/v1/transferencias-discricionarias", transferenciasDiscricionariasRouter);

const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error("Request error:", req.method, req.originalUrl, error);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ message: "Erro interno no servidor." });
};

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.originalUrl
  });
});
