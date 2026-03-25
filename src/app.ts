import "express-async-errors";
import "./config/env";
import cors from "cors";
import express, { ErrorRequestHandler } from "express";
import helmet from "helmet";
import morgan from "morgan";

import { authRouter } from "./modules/auth/auth.routes";
import { auditoriaRouter } from "./modules/auditoria/auditoria.routes";
import { convenetesRouter } from "./modules/convenetes/convenetes.routes";
import { instrumentosRouter } from "./modules/instrumentos/instrumentos.routes";
import { instrumentosPublicRouter } from "./modules/instrumentos/instrumentos.public.routes";
import { relatoriosRouter } from "./modules/relatorios/relatorios.routes";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes";

export const app = express();

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
      <li><code>/api/v1/convenetes</code></li>
      <li><code>/api/v1/usuarios</code></li>
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
app.use("/api/v1/instrumentos", instrumentosRouter);
app.use("/api/v1/auditoria", auditoriaRouter);
app.use("/api/v1/convenetes", convenetesRouter);
app.use("/api/v1/relatorios", relatoriosRouter);
app.use("/api/v1/usuarios", usuariosRouter);

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
