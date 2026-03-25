import { TicketPriority, TicketSource, TicketStatus } from "@prisma/client";
import { gmail_v1, google } from "googleapis";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { createTicket } from "../tickets/tickets.service";

type IngestionRunResult = {
  processed: number;
  created: number;
  ignored: number;
  errors: number;
  skippedAlreadyIngested: number;
};

const MAX_MESSAGES_PER_RUN = 20;

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
  const value = (match ? match[1] : raw).trim().toLowerCase();
  return value;
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
  const proposalMatch = source.match(/proposta\s*[:#-]?\s*([A-Za-z0-9./-]+)/i);
  if (proposalMatch) {
    return proposalMatch[1];
  }
  const instrumentMatch = source.match(/instrumento\s*[:#-]?\s*([A-Za-z0-9./-]+)/i);
  if (instrumentMatch) {
    return instrumentMatch[1];
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
    `Origem: EMAIL`,
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
  systemUserId: number
): Promise<"created" | "ignored" | "error" | "skipped"> => {
  const already = await prisma.ticketEmailIngestion.findUnique({
    where: { gmailMessageId: messageId },
    select: { id: true }
  });
  if (already) {
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
      await prisma.ticketEmailIngestion.create({
        data: {
          gmailMessageId: messageId,
          gmailThreadId: full.data.threadId ?? null,
          fromEmail,
          subject,
          receivedAt,
          statusProcessamento: "IGNORADO",
          erro: "Remetente fora da allowlist de dominios.",
          payloadRaw
        }
      });
      return "ignored";
    }

    const hint = extractInstrumentHint(subject, bodyText);
    const instrumentId = await findInstrumentIdByHint(hint);
    const created = await createTicket(
      {
        titulo: subject.trim() || "Ticket aberto por email",
        descricao: makeTicketDescription(fromEmail, subject, bodyText, receivedAt),
        status: TicketStatus.ABERTO,
        prioridade: inferPriority(subject, bodyText),
        instrument_id: instrumentId ?? undefined,
        instrumento_informado: instrumentId ? undefined : hint ?? undefined
      },
      {
        createdByUserId: systemUserId,
        source: TicketSource.EMAIL
      }
    );

    await prisma.ticketEmailIngestion.create({
      data: {
        gmailMessageId: messageId,
        gmailThreadId: full.data.threadId ?? null,
        fromEmail,
        subject,
        receivedAt,
        statusProcessamento: "CRIADO",
        payloadRaw,
        ticketId: created.id
      }
    });

    return "created";
  } catch (error) {
    await prisma.ticketEmailIngestion.create({
      data: {
        gmailMessageId: messageId,
        fromEmail: "desconhecido",
        statusProcessamento: "ERRO",
        erro: error instanceof Error ? error.message.slice(0, 500) : "Erro desconhecido"
      }
    });
    return "error";
  }
};

export const runGmailTicketIngestion = async (): Promise<IngestionRunResult> => {
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
    maxResults: MAX_MESSAGES_PER_RUN
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
    const status = await processMessage(gmail, item.id, systemUserId);
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
