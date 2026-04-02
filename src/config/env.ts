import dotenv from "dotenv";

dotenv.config({ override: true });

export const env = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "gestconv360-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
  transferenciasEspeciaisBaseUrl:
    process.env.TRANSFERENCIAS_ESPECIAIS_BASE_URL ?? "https://api.transferegov.gestao.gov.br/transferenciasespeciais",
  transferenciasEspeciaisTimeoutMs: Number(process.env.TRANSFERENCIAS_ESPECIAIS_TIMEOUT_MS ?? 15000),
  transferenciasEspeciaisCacheTtlMs: Number(process.env.TRANSFERENCIAS_ESPECIAIS_CACHE_TTL_MS ?? 60000),
  transferenciasDiscricionariasSyncEnabled: process.env.TRANSFERENCIAS_DISCRICIONARIAS_SYNC_ENABLED === "true",
  transferenciasDiscricionariasSyncIntervalMs: Number(
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SYNC_INTERVAL_MS ?? 21600000
  ),
  transferenciasDiscricionariasSyncSchedule:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SYNC_SCHEDULE ?? "00:00,06:00,12:00",
  transferenciasDiscricionariasSyncTimezone:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SYNC_TIMEZONE ?? "America/Sao_Paulo",
  transferenciasDiscricionariasSourceBaseUrl:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SOURCE_BASE_URL ?? "http://repositorio.dados.gov.br/seges/detru",
  transferenciasDiscricionariasSourceFiles:
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_SOURCE_FILES ??
    "siconv_prop_inst_indicadores_estados.csv.zip,siconv_prop_inst_indicadores_municipios.csv.zip,siconv_desembolso.csv.zip",
  transferenciasDiscricionariasRequestTimeoutMs: Number(
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_REQUEST_TIMEOUT_MS ?? 180000
  ),
  transferenciasDiscricionariasDownloadRetries: Number(
    process.env.TRANSFERENCIAS_DISCRICIONARIAS_DOWNLOAD_RETRIES ?? 3
  ),
  gmailTicketIngestionEnabled: process.env.GMAIL_TICKET_INGESTION_ENABLED === "true",
  gmailClientId: process.env.GMAIL_CLIENT_ID ?? "",
  gmailClientSecret: process.env.GMAIL_CLIENT_SECRET ?? "",
  gmailRefreshToken: process.env.GMAIL_REFRESH_TOKEN ?? "",
  gmailUserEmail: process.env.GMAIL_USER_EMAIL ?? "",
  gmailTicketSystemUserEmail: process.env.GMAIL_TICKET_SYSTEM_USER_EMAIL ?? "",
  gmailTicketAllowedDomains: process.env.GMAIL_TICKET_ALLOWED_DOMAINS ?? "",
  gmailTicketQuery: process.env.GMAIL_TICKET_QUERY ?? "in:inbox",
  gmailTicketPollIntervalMs: Number(process.env.GMAIL_TICKET_POLL_INTERVAL_MS ?? 120000),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",
  openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
  aiTicketSummaryEnabled: process.env.AI_TICKET_SUMMARY_ENABLED === "true",
  aiDocumentSummaryEnabled: process.env.AI_DOCUMENT_SUMMARY_ENABLED === "true",
  aiDocumentQaEnabled: process.env.AI_DOCUMENT_QA_ENABLED === "true",
  aiDocumentSemanticEnabled: process.env.AI_DOCUMENT_SEMANTIC_ENABLED === "true",
  aiDocumentClassificationEnabled: process.env.AI_DOCUMENT_CLASSIFICATION_ENABLED === "true",
  aiDocumentOcrEnabled: process.env.AI_DOCUMENT_OCR_ENABLED === "true",
  ocrSpaceApiKey: process.env.OCR_SPACE_API_KEY ?? "",
  ocrSpaceLanguage: process.env.OCR_SPACE_LANGUAGE ?? "por"
};
