import { Router } from "express";
import multer from "multer";

import {
  publicTokenParamSchema,
  publicUploadRequestDocumentBodySchema
} from "./documents-ai-requests.schema";
import {
  fulfillDocumentAiRequestByPublicToken,
  getActiveDocumentAiRequestPublicLinkByToken,
  getDocumentAiRequestPublicLinkByToken
} from "./documents-ai-requests.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderUnavailablePage = (payload: { title: string; message: string }) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Link indisponivel - Gestconv360</title>
    <style>
      :root { --bg: #f5f9fc; --card: #fff; --line: #d5e2ee; --ink: #153149; --muted: #5a7287; --warn: #9f2f2f; }
      * { box-sizing: border-box; }
      body { margin: 0; background: linear-gradient(160deg, #e8f2fa 0%, var(--bg) 60%); color: var(--ink); font: 15px/1.45 "Segoe UI", sans-serif; }
      main { max-width: 760px; margin: 28px auto; padding: 0 14px; }
      .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 10px 28px rgba(17, 50, 77, 0.08); padding: 16px; }
      .brand-logo { width: 100%; max-width: 220px; height: auto; display: block; margin: 0 auto 12px; }
      h1 { margin: 0 0 8px; font-size: 22px; color: var(--warn); }
      p { margin: 0 0 10px; }
      .muted { color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <img class="brand-logo" src="/api/v1/public/brand-logo" alt="NC Convenios" />
        <h1>${escapeHtml(payload.title)}</h1>
        <p>${escapeHtml(payload.message)}</p>
        <p class="muted">Solicite um novo link para reenviar a documentacao.</p>
      </section>
    </main>
  </body>
</html>`;

const renderThankYouPage = (payload: { message: string }) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Obrigado pelo envio - Gestconv360</title>
    <style>
      :root { --bg: #f2f8f4; --card: #fff; --line: #d5e7da; --ink: #173a2b; --muted: #537365; --ok: #2a7a52; }
      * { box-sizing: border-box; }
      body { margin: 0; background: linear-gradient(160deg, #e4f4ea 0%, var(--bg) 60%); color: var(--ink); font: 15px/1.45 "Segoe UI", sans-serif; }
      main { max-width: 760px; margin: 28px auto; padding: 0 14px; }
      .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 10px 28px rgba(20, 77, 52, 0.1); padding: 16px; }
      .brand-logo { width: 100%; max-width: 220px; height: auto; display: block; margin: 0 auto 12px; }
      h1 { margin: 0 0 8px; font-size: 22px; color: var(--ok); }
      p { margin: 0 0 10px; }
      .muted { color: var(--muted); }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <img class="brand-logo" src="/api/v1/public/brand-logo" alt="NC Convenios" />
        <h1>Documentacao recebida com sucesso</h1>
        <p>${escapeHtml(payload.message)}</p>
      </section>
    </main>
  </body>
</html>`;

const renderPublicDocumentRequestPage = (payload: {
  token: string;
  titulo: string;
  descricao: string | null;
  prazo: Date | null;
  flashStatus?: "ok" | "error";
  flashMessage?: string;
}) => `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Envio de documentos - Gestconv360</title>
    <style>
      :root { --bg: #eef4fb; --card: #fff; --line: #d6e2ef; --ink: #16324a; --muted: #5d7488; --primary: #1f5f9a; --primary-dark: #184d7d; --error: #a33b3b; }
      * { box-sizing: border-box; }
      body { margin: 0; background: linear-gradient(165deg, #dbe9f6 0%, var(--bg) 58%); color: var(--ink); font: 15px/1.45 "Segoe UI", sans-serif; }
      main { max-width: 820px; margin: 28px auto; padding: 0 14px; }
      .card { background: var(--card); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 10px 28px rgba(17, 50, 77, 0.09); padding: 16px; }
      .brand-logo { width: 100%; max-width: 220px; height: auto; display: block; margin: 0 auto 12px; }
      h1 { margin: 0 0 6px; font-size: 24px; }
      p { margin: 0 0 10px; }
      .muted { color: var(--muted); }
      label { display: block; font-weight: 600; margin-bottom: 12px; }
      input, textarea { width: 100%; margin-top: 6px; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font: inherit; }
      textarea { min-height: 92px; resize: vertical; }
      .status { margin-bottom: 10px; font-weight: 600; color: var(--primary); }
      .status.error { color: var(--error); }
      button { border: 0; border-radius: 10px; padding: 11px 14px; color: #fff; background: var(--primary); font: inherit; font-weight: 600; cursor: pointer; }
      button:hover { background: var(--primary-dark); }
      .hint { font-size: 13px; }
    </style>
  </head>
  <body>
    <main>
      <section class="card">
        <img class="brand-logo" src="/api/v1/public/brand-logo" alt="NC Convenios" />
        <h1>${escapeHtml(payload.titulo)}</h1>
        ${payload.descricao ? `<p>${escapeHtml(payload.descricao)}</p>` : ""}
        <p class="muted">Prazo para envio: ${payload.prazo ? payload.prazo.toLocaleString("pt-BR") : "sem prazo definido"}</p>
        ${
          payload.flashMessage
            ? `<p class="status ${payload.flashStatus === "error" ? "error" : ""}">${escapeHtml(payload.flashMessage)}</p>`
            : ""
        }
        <form method="post" action="/api/v1/public/document-ai-requests/${encodeURIComponent(payload.token)}/upload" enctype="multipart/form-data">
          <label>
            Seu nome
            <input type="text" name="nome_remetente" required maxlength="120" placeholder="Digite seu nome" />
          </label>
          <label>
            Arquivos PDF
            <input type="file" name="arquivos" accept="application/pdf,.pdf" multiple required />
          </label>
          <p class="muted hint">Voce pode enviar varios PDFs de uma vez. Limite de 20MB por arquivo.</p>
          <button type="submit">Enviar documentos</button>
        </form>
      </section>
    </main>
  </body>
</html>`;

const redirectWithStatus = (token: string, status: "ok" | "error", message: string) => {
  return `/api/v1/public/document-ai-requests/${token}?status=${status}&message=${encodeURIComponent(message)}`;
};

export const documentsPublicRouter = Router();

documentsPublicRouter.get("/document-ai-requests/:token", async (req, res) => {
  const parsedToken = publicTokenParamSchema.safeParse(req.params);
  if (!parsedToken.success) {
    return res.status(400).type("html").send(
      renderUnavailablePage({
        title: "Link invalido",
        message: "Este link nao e valido."
      })
    );
  }

  const link = await getActiveDocumentAiRequestPublicLinkByToken(parsedToken.data.token);
  if (!link) {
    const anyLink = await getDocumentAiRequestPublicLinkByToken(parsedToken.data.token);
    if (!anyLink) {
      return res.status(404).type("html").send(
        renderUnavailablePage({
          title: "Link nao encontrado",
          message: "Este link nao existe ou foi removido."
        })
      );
    }

    if (req.query.status === "ok") {
      const successMessage =
        typeof req.query.message === "string" && req.query.message.trim().length > 0
          ? req.query.message
          : "Agradecemos. A documentacao foi recebida com sucesso.";

      return res.status(200).type("html").send(
        renderThankYouPage({
          message: successMessage
        })
      );
    }

    const isExpired = anyLink.expiraEm.getTime() < Date.now();
    return res.status(410).type("html").send(
      renderUnavailablePage({
        title: isExpired ? "Link expirado" : "Link desativado",
        message: isExpired
          ? "O prazo deste link terminou e ele nao pode mais receber anexos."
          : "Este link foi desativado e nao pode mais receber anexos."
      })
    );
  }

  if (req.query.format === "json") {
    return res.json({
      token: link.token,
      request: {
        id: link.request.id,
        titulo: link.request.titulo,
        descricao: link.request.descricao,
        status: link.request.status,
        prazo: link.request.prazo?.toISOString() ?? null
      },
      expira_em: link.expiraEm.toISOString(),
      ativo: link.ativo
    });
  }

  return res.status(200).type("html").send(
    renderPublicDocumentRequestPage({
      token: link.token,
      titulo: link.request.titulo,
      descricao: link.request.descricao,
      prazo: link.request.prazo,
      flashStatus: req.query.status === "error" ? "error" : req.query.status === "ok" ? "ok" : undefined,
      flashMessage: typeof req.query.message === "string" ? req.query.message : undefined
    })
  );
});

documentsPublicRouter.post("/document-ai-requests/:token/upload", upload.array("arquivos", 20), async (req, res) => {
  const parsedToken = publicTokenParamSchema.safeParse(req.params);
  if (!parsedToken.success) {
    return res.status(400).json({ message: "Link invalido." });
  }

  const parsedBody = publicUploadRequestDocumentBodySchema.safeParse(req.body ?? {});
  if (!parsedBody.success) {
    return res.redirect(303, redirectWithStatus(parsedToken.data.token, "error", "Preencha seu nome corretamente."));
  }

  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (files.length === 0) {
    return res.redirect(303, redirectWithStatus(parsedToken.data.token, "error", "Envie pelo menos um arquivo PDF."));
  }

  try {
    const result = await fulfillDocumentAiRequestByPublicToken(parsedToken.data.token, parsedBody.data, files);
    const message = `Documentacao recebida com sucesso. Total de arquivos enviados: ${result.documentos.length}.`;
    return res.redirect(303, redirectWithStatus(parsedToken.data.token, "ok", message));
  } catch (error) {
    if (error instanceof Error && error.message === "DOCUMENT_AI_REQUEST_LINK_NOT_FOUND") {
      return res.redirect(303, redirectWithStatus(parsedToken.data.token, "error", "Link nao encontrado ou expirado."));
    }
    if (error instanceof Error && error.message === "DOCUMENT_AI_REQUEST_CANCELLED") {
      return res.redirect(303, redirectWithStatus(parsedToken.data.token, "error", "Solicitacao cancelada."));
    }
    return res.redirect(303, redirectWithStatus(parsedToken.data.token, "error", "Erro interno ao processar envio."));
  }
});
