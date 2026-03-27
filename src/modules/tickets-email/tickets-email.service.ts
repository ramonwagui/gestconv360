import { TicketPriority, TicketSource, TicketStatus } from "@prisma/client";
import { gmail_v1, google } from "googleapis";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { addTicketChecklistItems, createTicket } from "../tickets/tickets.service";
import {
  formatTicketDescriptionWithAI,
  getChecklistFromSummary,
  generateTicketSummary,
  identifyInstrumentWithAI
} from "./ai-ticket.service";
import { registrarEmailRecebido } from "../solicitacao-caixa/solicitacao-caixa.service";

type IngestionRunResult = {
  processed: number;
  created: number;
  ignored: number;
  errors: number;
  skippedAlreadyIngested: number;
};

type IngestionRunOptions = {
  reprocessProcessed?: boolean;
  maxMessages?: number;
};

const MAX_MESSAGES_PER_RUN = 20;

const upsertIngestionRecord = async (
  gmailMessageId: string,
  data: {
    gmailThreadId?: string | null;
    fromEmail: string;
    subject?: string;
    receivedAt?: Date | null;
    statusProcessamento: "CRIADO" | "IGNORADO" | "ERRO";
    erro?: string | null;
    payloadRaw?: string | null;
    ticketId?: number | null;
  }
) => {
  await prisma.ticketEmailIngestion.upsert({
    where: { gmailMessageId },
    create: {
      gmailMessageId,
      gmailThreadId: data.gmailThreadId ?? null,
      fromEmail: data.fromEmail,
      subject: data.subject ?? null,
      receivedAt: data.receivedAt ?? null,
      statusProcessamento: data.statusProcessamento,
      erro: data.erro ?? null,
      payloadRaw: data.payloadRaw ?? null,
      ticketId: data.ticketId ?? null
    },
    update: {
      gmailThreadId: data.gmailThreadId ?? null,
      fromEmail: data.fromEmail,
      subject: data.subject ?? null,
      receivedAt: data.receivedAt ?? null,
      statusProcessamento: data.statusProcessamento,
      erro: data.erro ?? null,
      payloadRaw: data.payloadRaw ?? null,
      ticketId: data.ticketId ?? null
    }
  });
};

const getAllowedDomains = () =>
  env.gmailTicketAllowedDomains
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);

const isGmailConfigured = () =>
  env.gmailClientId && env.gmailClientSecret && env.gmailRefreshToken && env.gmailUserEmail;

const buildGmailClient = () => {
  const auth = new google.auth.OAuth2(env.gmailClientId, env.gmailClientSecret);
  auth.setCredentials({
    refresh_token: env.gmailRefreshToken
  });
  return google.gmail({ version: "v1", auth });
};

const parseEmailAddress = (raw: string | null | undefined) => {
  if (!raw) {
    return "";
  }
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim().toLowerCase();
};

const getHeader = (message: gmail_v1.Schema$Message, headerName: string) => {
  return (
    message.payload?.headers?.find((item) => item.name?.toLowerCase() === headerName.toLowerCase())?.value ?? null
  );
};

const decodeBase64Url = (value: string) => {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
};

const extractTextFromParts = (parts: gmail_v1.Schema$MessagePart[] | undefined): string => {
  if (!parts || parts.length === 0) {
    return "";
  }

  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    const nested = extractTextFromParts(part.parts);
    if (nested.trim()) {
      return nested;
    }
  }
  return "";
};

const extractTextBody = (message: gmail_v1.Schema$Message) => {
  if (message.payload?.mimeType === "text/plain" && message.payload.body?.data) {
    return decodeBase64Url(message.payload.body.data);
  }
  const fromParts = extractTextFromParts(message.payload?.parts);
  if (fromParts.trim()) {
    return fromParts;
  }
  return message.snippet ?? "";
};

const inferPriority = (subject: string, body: string): TicketPriority => {
  const content = `${subject} ${body}`.toLowerCase();
  if (content.includes("critico") || content.includes("urgente") || content.includes("parado")) {
    return "CRITICA";
  }
  if (content.includes("alta prioridade") || content.includes("alto impacto")) {
    return "ALTA";
  }
  if (content.includes("baixa prioridade")) {
    return "BAIXA";
  }
  return "MEDIA";
};

const extractInstrumentHint = (subject: string, body: string) => {
  const source = `${subject}\n${body}`;

  const patterns = [
    /proposta\s*[:#-]?\s*([A-Za-z0-9./-]+)/i,
    /instrumento\s*[:#-]?\s*([A-Za-z0-9./-]+)/i,
    /n[\u00BAo\u00B0.]\s*(?:proposta|instrumento)\s*[:#-]?\s*([A-Za-z0-9./-]+)/i,
    /(?:proposta|instrumento)\s+n[\u00BAo\u00B0.]\s*[:#-]?\s*([A-Za-z0-9./-]+)/i,
    /\b(P\d{4,})\b/i,
    /\b(INST[-.]?\d{4,})\b/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
};

const resolveSystemUserId = async () => {
  const preferred = env.gmailTicketSystemUserEmail.trim().toLowerCase();
  if (preferred) {
    const byEmail = await prisma.user.findUnique({ where: { email: preferred }, select: { id: true } });
    if (byEmail) {
      return byEmail.id;
    }
  }

  const fallback = await prisma.user.findFirst({
    where: {
      role: "ADMIN"
    },
    orderBy: [{ id: "asc" }],
    select: { id: true }
  });

  if (!fallback) {
    throw new Error("TICKET_EMAIL_SYSTEM_USER_NOT_FOUND");
  }

  return fallback.id;
};

const findInstrumentIdByHint = async (hint: string | null) => {
  if (!hint) {
    return null;
  }

  const exact = await prisma.instrumentProposal.findFirst({
    where: {
      OR: [{ proposta: hint }, { instrumento: hint }]
    },
    select: { id: true }
  });
  if (exact) {
    return exact.id;
  }

  const partial = await prisma.instrumentProposal.findFirst({
    where: {
      OR: [{ proposta: { contains: hint } }, { instrumento: { contains: hint } }]
    },
    select: { id: true }
  });

  return partial?.id ?? null;
};

const findInstrumentIdByAI = async (subject: string, body: string) => {
  const aiHint = await identifyInstrumentWithAI(subject, body);
  if (!aiHint) {
    return null;
  }

  if (aiHint.proposta) {
    const byProposta = await findInstrumentIdByHint(aiHint.proposta);
    if (byProposta) {
      return byProposta;
    }
  }

  if (aiHint.instrumento) {
    const byInstrumento = await findInstrumentIdByHint(aiHint.instrumento);
    if (byInstrumento) {
      return byInstrumento;
    }
  }

  return null;
};

const isAllowedSender = (fromEmail: string) => {
  const domains = getAllowedDomains();
  if (domains.length === 0) {
    return true;
  }
  const domain = fromEmail.split("@")[1] ?? "";
  return domains.includes(domain.toLowerCase());
};

const makeTicketDescription = (fromEmail: string, subject: string, body: string, receivedAt: Date | null) => {
  const lines = [
    "Origem: EMAIL",
    `Remetente: ${fromEmail}`,
    `Assunto: ${subject || "(sem assunto)"}`,
    `Recebido em: ${receivedAt ? receivedAt.toISOString() : "desconhecido"}`,
    "",
    body.trim()
  ];
  return lines.join("\n").slice(0, 4000);
};

const processMessage = async (
  gmail: gmail_v1.Gmail,
  messageId: string,
  systemUserId: number,
  options?: IngestionRunOptions
): Promise<"created" | "ignored" | "error" | "skipped"> => {
  const allowReprocess = options?.reprocessProcessed === true;
  const already = await prisma.ticketEmailIngestion.findUnique({
    where: { gmailMessageId: messageId },
    select: { id: true }
  });
  if (already && !allowReprocess) {
    return "skipped";
  }

  try {
    const full = await gmail.users.messages.get({
      userId: env.gmailUserEmail,
      id: messageId,
      format: "full"
    });

    const fromEmail = parseEmailAddress(getHeader(full.data, "From"));
    const subject = getHeader(full.data, "Subject") ?? "";
    const receivedAt = full.data.internalDate ? new Date(Number(full.data.internalDate)) : null;
    const bodyText = extractTextBody(full.data);
    const payloadRaw = JSON.stringify({
      snippet: full.data.snippet,
      headers: full.data.payload?.headers
    });

    if (!isAllowedSender(fromEmail)) {
      await upsertIngestionRecord(messageId, {
        gmailThreadId: full.data.threadId ?? null,
        fromEmail,
        subject,
        receivedAt,
        statusProcessamento: "IGNORADO",
        erro: "Remetente fora da allowlist de dominios.",
        payloadRaw
      });
      return "ignored";
    }

    const regexHint = extractInstrumentHint(subject, bodyText);
    let instrumentId = await findInstrumentIdByHint(regexHint);

    if (!instrumentId) {
      instrumentId = await findInstrumentIdByAI(subject, bodyText);
    }

    let descricao = makeTicketDescription(fromEmail, subject, bodyText, receivedAt);
    let checklistItems: string[] = [];
    if (env.aiTicketSummaryEnabled) {
      const summary = await generateTicketSummary(subject, bodyText, fromEmail);
      if (summary) {
        descricao = formatTicketDescriptionWithAI(summary, fromEmail, subject, receivedAt);
        checklistItems = getChecklistFromSummary(summary);
        if (!instrumentId && summary.instrumento_identificado) {
          const bySummary = await findInstrumentIdByHint(summary.instrumento_identificado);
          if (bySummary) {
            instrumentId = bySummary;
          }
        }
      }
    }

    const created = await createTicket(
      {
        titulo: subject.trim() || "Ticket aberto por email",
        descricao,
        status: TicketStatus.ABERTO,
        prioridade: inferPriority(subject, bodyText),
        instrument_id: instrumentId ?? undefined,
        instrumento_informado: instrumentId ? undefined : regexHint ?? undefined
      },
      {
        createdByUserId: systemUserId,
        source: TicketSource.EMAIL
      }
    );

    if (checklistItems.length > 0) {
      await addTicketChecklistItems(created.id, checklistItems);
    }

    if (instrumentId) {
      await registrarEmailRecebido(instrumentId, fromEmail, subject, created.id);
    }

    await upsertIngestionRecord(messageId, {
      gmailThreadId: full.data.threadId ?? null,
      fromEmail,
      subject,
      receivedAt,
      statusProcessamento: "CRIADO",
      payloadRaw,
      ticketId: created.id
    });

    return "created";
  } catch (error) {
    await upsertIngestionRecord(messageId, {
      fromEmail: "desconhecido",
      statusProcessamento: "ERRO",
      erro: error instanceof Error ? error.message.slice(0, 500) : "Erro desconhecido"
    });
    return "error";
  }
};

export const runGmailTicketIngestion = async (options?: IngestionRunOptions): Promise<IngestionRunResult> => {
  if (!env.gmailTicketIngestionEnabled) {
    return { processed: 0, created: 0, ignored: 0, errors: 0, skippedAlreadyIngested: 0 };
  }
  if (!isGmailConfigured()) {
    throw new Error("GMAIL_TICKET_CONFIG_MISSING");
  }

  const systemUserId = await resolveSystemUserId();
  const gmail = buildGmailClient();
  const listed = await gmail.users.messages.list({
    userId: env.gmailUserEmail,
    q: env.gmailTicketQuery,
    maxResults:
      options?.maxMessages && Number.isFinite(options.maxMessages)
        ? Math.max(1, Math.min(100, options.maxMessages))
        : MAX_MESSAGES_PER_RUN
  });

  const messages = listed.data.messages ?? [];
  const result: IngestionRunResult = {
    processed: messages.length,
    created: 0,
    ignored: 0,
    errors: 0,
    skippedAlreadyIngested: 0
  };

  for (const item of messages) {
    if (!item.id) {
      continue;
    }
    const status = await processMessage(gmail, item.id, systemUserId, options);
    if (status === "created") {
      result.created += 1;
    } else if (status === "ignored") {
      result.ignored += 1;
    } else if (status === "error") {
      result.errors += 1;
    } else {
      result.skippedAlreadyIngested += 1;
    }
  }

  return result;
};

export const getEmailIngestionOverview = async () => {
  const latest = await prisma.ticketEmailIngestion.findMany({
    take: 20,
    orderBy: [{ createdAt: "desc" }],
    include: {
      ticket: {
        select: {
          id: true,
          codigo: true,
          status: true
        }
      }
    }
  });

  const totals = await prisma.ticketEmailIngestion.groupBy({
    by: ["statusProcessamento"],
    _count: {
      _all: true
    }
  });

  return {
    enabled: env.gmailTicketIngestionEnabled,
    configured: Boolean(isGmailConfigured()),
    query: env.gmailTicketQuery,
    allowedDomains: getAllowedDomains(),
    totals,
    latest
  };
};
