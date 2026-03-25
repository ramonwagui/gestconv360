import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useState } from "react";

import {
  addWorkMeasurementBulletin,
  addInstrumentRepasse,
  addChecklistItem,
  addTicketComment,
  createUserAdmin,
  seedDemoDataAdmin,
  createChecklistExternalLink,
  deactivateChecklistExternalLink as deactivateChecklistExternalLinkApi,
  createConvenete,
  createInstrument,
  createTicket,
  deleteWorkMeasurementBulletin,
  deleteInstrumentRepasse,
  deleteConvenete,
  deactivateInstrument,
  deleteChecklistItem,
  downloadChecklistExternalFile,
  downloadStageFollowUpFile,
  getInstrumentById,
  getInstrumentChecklist,
  getMyProfile,
  getObraReport,
  getRepasseReport,
  getTicketById,
  getWorkProgress,
  healthCheck,
  listAuditLogs,
  listConvenetes,
  listDeadlineAlerts,
  listInstruments,
  listInstrumentRepasses,
  listTicketAssignableUsers,
  listTickets,
  listUsersAdmin,
  login,
  removeMyAvatar,
  createStageFollowUp,
  listStageFollowUps,
  updateUserAdmin,
  updateChecklistItem,
  updateConvenete,
  updateTicket,
  updateWorkProgress,
  updateInstrument,
  uploadMyAvatar
} from "./api";
import type {
  AuditAction,
  AuditLogItem,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistSummary,
  Convenete,
  ConvenetePayload,
  DeadlineAlertItem,
  Instrument,
  InstrumentFlowType,
  InstrumentFilters,
  InstrumentPayload,
  InstrumentStatus,
  ManagedUser,
  ObraReportResponse,
  Ticket,
  TicketPriority,
  TicketSource,
  TicketStatus,
  Role,
  RepasseReportResponse,
  StageFollowUp,
  User,
  WorkProgress,
  WorkflowStage
} from "./types";

const TOKEN_KEY = "gestconv360.token";
const USER_KEY = "gestconv360.user";
const TICKET_TAB_KEY = "gestconv360.ticket-tab";

const STATUS_OPTIONS: InstrumentStatus[] = [
  "EM_ELABORACAO",
  "ASSINADO",
  "EM_EXECUCAO",
  "VENCIDO",
  "PRESTACAO_PENDENTE",
  "CONCLUIDO"
];

const AUDIT_ACTION_OPTIONS: AuditAction[] = ["CREATE", "UPDATE", "DEACTIVATE"];
const TICKET_STATUS_OPTIONS: TicketStatus[] = ["ABERTO", "EM_ANDAMENTO", "RESOLVIDO", "CANCELADO"];
const TICKET_SOURCE_OPTIONS: TicketSource[] = ["MANUAL", "EMAIL"];
const TICKET_PRIORITY_OPTIONS: TicketPriority[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  ABERTO: "Aberto",
  EM_ANDAMENTO: "Em andamento",
  RESOLVIDO: "Resolvido",
  CANCELADO: "Cancelado"
};
const TICKET_SOURCE_LABELS: Record<TicketSource, string> = {
  MANUAL: "Manual",
  EMAIL: "Email"
};
const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  BAIXA: "Baixa",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Critica"
};

const FLOW_TYPE_OPTIONS: InstrumentFlowType[] = ["OBRA", "AQUISICAO_EQUIPAMENTOS", "EVENTOS"];

const FLOW_TYPE_LABELS: Record<InstrumentFlowType, string> = {
  OBRA: "Obra",
  AQUISICAO_EQUIPAMENTOS: "Aquisicao de Equipamentos",
  EVENTOS: "Eventos"
};

const WORKFLOW_STAGES: WorkflowStage[] = [
  "PROPOSTA",
  "REQUISITOS_CELEBRACAO",
  "PROJETO_BASICO_TERMO_REFERENCIA",
  "PROCESSO_EXECUCAO_LICITACAO",
  "VERIFICACAO_PROCESSO_LICITATORIO",
  "INSTRUMENTOS_CONTRATUAIS",
  "ACOMPANHAMENTO_OBRA"
];

const CHECKLIST_STATUS_OPTIONS: ChecklistItemStatus[] = [
  "NAO_INICIADO",
  "EM_ELABORACAO",
  "CONCLUIDO",
  "ACEITO"
];

const EXTERNAL_LINK_VALIDITY_OPTIONS = [1, 3, 7, 15, 30] as const;

const CHECKLIST_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  NAO_INICIADO: "Em analise",
  EM_ELABORACAO: "Em elaboracao",
  CONCLUIDO: "Concluido",
  ACEITO: "Aceito"
};

const PROPOSTA_STATUS_OPTIONS: ChecklistItemStatus[] = ["NAO_INICIADO", "ACEITO", "EM_ELABORACAO"];
const PROPOSTA_STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  ACEITO: "Aprovado",
  EM_ELABORACAO: "Ajustar",
  CONCLUIDO: "Aprovado",
  NAO_INICIADO: "Em analise"
};

const STAGE_LABELS_BY_FLOW: Record<InstrumentFlowType, Record<WorkflowStage, string>> = {
  OBRA: {
    PROPOSTA: "Proposta",
    REQUISITOS_CELEBRACAO: "Requisitos de Celebracao",
    PROJETO_BASICO_TERMO_REFERENCIA: "Projeto Basico / Termo de Referencia",
    PROCESSO_EXECUCAO_LICITACAO: "Processo de Execucao (Licitacao)",
    VERIFICACAO_PROCESSO_LICITATORIO: "Verificacao do Processo Licitatorio",
    INSTRUMENTOS_CONTRATUAIS: "Instrumentos Contratuais",
    ACOMPANHAMENTO_OBRA: "Acompanhamento de Obra"
  },
  AQUISICAO_EQUIPAMENTOS: {
    PROPOSTA: "Proposta",
    REQUISITOS_CELEBRACAO: "Requisitos de Celebracao",
    PROJETO_BASICO_TERMO_REFERENCIA: "Termo de Referencia e Projeto",
    PROCESSO_EXECUCAO_LICITACAO: "Processo de Aquisicao (Licitacao)",
    VERIFICACAO_PROCESSO_LICITATORIO: "Verificacao do Processo Licitatorio",
    INSTRUMENTOS_CONTRATUAIS: "Instrumentos Contratuais",
    ACOMPANHAMENTO_OBRA: "Acompanhamento de Entregas"
  },
  EVENTOS: {
    PROPOSTA: "Proposta",
    REQUISITOS_CELEBRACAO: "Requisitos de Celebracao",
    PROJETO_BASICO_TERMO_REFERENCIA: "Plano Basico do Evento",
    PROCESSO_EXECUCAO_LICITACAO: "Processo de Contratacao",
    VERIFICACAO_PROCESSO_LICITATORIO: "Verificacao do Processo",
    INSTRUMENTOS_CONTRATUAIS: "Instrumentos Contratuais",
    ACOMPANHAMENTO_OBRA: "Acompanhamento de Execucao"
  }
};

const getStageLabels = (flowType?: InstrumentFlowType) => {
  return STAGE_LABELS_BY_FLOW[flowType ?? "OBRA"];
};

const emptyStageFollowUps = (): Record<WorkflowStage, StageFollowUp[]> => ({
  PROPOSTA: [],
  REQUISITOS_CELEBRACAO: [],
  PROJETO_BASICO_TERMO_REFERENCIA: [],
  PROCESSO_EXECUCAO_LICITACAO: [],
  VERIFICACAO_PROCESSO_LICITATORIO: [],
  INSTRUMENTOS_CONTRATUAIS: [],
  ACOMPANHAMENTO_OBRA: []
});

type MenuView = "dashboard" | "instrumentos" | "convenetes" | "usuarios" | "auditoria" | "tickets" | "relatorios";
type StageFollowUpFilter = "TODOS" | "SO_MEUS" | "COM_ANEXO" | "COM_TEXTO";
type ReportPdfMode = "executivo" | "analitico";

type ReportFilters = {
  convenete_id: string;
  instrumento_id: string;
  data_de: string;
  data_ate: string;
};

type ObraReportFilters = {
  convenete_id: string;
  instrumento_id: string;
  status: InstrumentStatus | "";
  ativo: "true" | "false";
  data_de: string;
  data_ate: string;
};

type RelatorioTab = "repasses" | "obras";
type TicketBoardTab = "abertos" | "resolvidos" | "cancelados";

type TicketFilters = {
  status: TicketStatus | "";
  prioridade: TicketPriority | "";
  origem: TicketSource | "";
  somente_atrasados: boolean;
  instrument_id: string;
  responsavel_user_id: string;
  q: string;
};

type TechnicalRouteStatus = "checking" | "ok" | "missing" | "error";

type TechnicalHealthState = {
  backendVersion: string;
  reportRouteStatus: TechnicalRouteStatus;
  lastCheckedAt: string | null;
};

const STAGE_FOLLOW_UP_FILTER_LABELS: Record<StageFollowUpFilter, string> = {
  TODOS: "Todos",
  SO_MEUS: "So meus",
  COM_ANEXO: "Com anexo",
  COM_TEXTO: "Com texto"
};

type ConveneteForm = ConvenetePayload;
type AdminUserForm = {
  nome: string;
  email: string;
  senha: string;
  role: Role;
};

type InstrumentForm = {
  proposta: string;
  instrumento: string;
  objeto: string;
  valor_repasse: string;
  valor_contrapartida: string;
  data_cadastro: string;
  data_assinatura: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  data_prestacao_contas: string;
  data_dou: string;
  concedente: string;
  banco: string;
  agencia: string;
  conta: string;
  fluxo_tipo: InstrumentFlowType;
  convenete_id: string;
  status: InstrumentStatus;
  responsavel: string;
  orgao_executor: string;
  observacoes: string;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const readInstrumentIdFromPath = (pathname: string): number | null => {
  const match = /^\/instrumentos\/(\d+)$/.exec(pathname);
  if (!match) {
    return null;
  }

  const id = Number(match[1]);
  return Number.isNaN(id) ? null : id;
};

const summarizeText = (value: string, maxLength = 140) => {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
};

const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }
  const kb = size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
};

const parseDateOnly = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDateOnlyPtBr = (value: string) => {
  const parsed = parseDateOnly(value);
  if (!parsed) {
    return "Data invalida";
  }
  return parsed.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

const formatTicketSla = (ticket: Ticket) => {
  if (!ticket.prazo_alvo) {
    return "Sem prazo";
  }

  const dueDate = parseDateOnly(ticket.prazo_alvo);
  if (!dueDate) {
    return "Prazo invalido";
  }

  if (ticket.status === "RESOLVIDO" && ticket.resolvido_em) {
    const resolvedAt = new Date(ticket.resolvido_em);
    const resolvedUtc = Date.UTC(resolvedAt.getUTCFullYear(), resolvedAt.getUTCMonth(), resolvedAt.getUTCDate());
    const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
    const diffDays = Math.floor((resolvedUtc - dueUtc) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return "Resolvido no prazo";
    }
    return `Resolvido com ${diffDays} dia(s) de atraso`;
  }

  if (ticket.status === "CANCELADO") {
    return "Cancelado";
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const diffDays = Math.floor((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return `Atrasado ha ${Math.abs(diffDays)} dia(s)`;
  }
  if (diffDays === 0) {
    return "Vence hoje";
  }
  return `Vence em ${diffDays} dia(s)`;
};

type TicketForm = {
  titulo: string;
  descricao: string;
  prioridade: TicketPriority;
  prazo_alvo: string;
  instrument_id: string;
  instrumento_informado: string;
  responsavel_user_id: string;
};

const formatBankInfo = (item: { banco: string | null; agencia: string | null; conta: string | null }) => {
  return [item.banco, item.agencia ? `Ag ${item.agencia}` : null, item.conta ? `Conta ${item.conta}` : null]
    .filter((value) => Boolean(value))
    .join(" | ");
};

const toAbsoluteUrl = (value: string) => {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      if (parsed.pathname.startsWith("/api/") && parsed.host !== window.location.host) {
        return `${parsed.pathname}${parsed.search}`;
      }
      return value;
    } catch {
      return value;
    }
  }
  return new URL(value, window.location.origin).toString();
};

const getExternalLinkState = (file: { origem_link_ativo: boolean; origem_link_expira_em: string | null }) => {
  if (file.origem_link_ativo) {
    return { label: "Link ativo", tone: "ok" as const };
  }
  if (file.origem_link_expira_em && new Date(file.origem_link_expira_em).getTime() < Date.now()) {
    return { label: "Link expirado", tone: "warn" as const };
  }
  return { label: "Link desativado", tone: "warn" as const };
};

const getChecklistStatusVisual = (status: ChecklistItemStatus) => {
  if (status === "ACEITO" || status === "CONCLUIDO") {
    return { icon: "✓", tone: "done" as const };
  }
  if (status === "EM_ELABORACAO") {
    return { icon: "!", tone: "adjust" as const };
  }
  return { icon: "i", tone: "analysis" as const };
};

const getChecklistStatusOptionLabel = (status: ChecklistItemStatus, label: string) => {
  return `${getChecklistStatusVisual(status).icon} ${label}`;
};

const getInitials = (name: string | null | undefined, email: string) => {
  const base = (name && name.trim().length > 0 ? name : email).trim();
  if (base.length === 0) {
    return "U";
  }
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
};

const blankFilters = (): InstrumentFilters => ({
  status: "",
  concedente: "",
  convenete_id: "",
  ativo: "true",
  vigencia_de: "",
  vigencia_ate: ""
});

const emptyReportFilters = (): ReportFilters => ({
  convenete_id: "",
  instrumento_id: "",
  data_de: "",
  data_ate: ""
});

const emptyObraReportFilters = (): ObraReportFilters => ({
  convenete_id: "",
  instrumento_id: "",
  status: "",
  ativo: "true",
  data_de: "",
  data_ate: ""
});

const emptyTicketFilters = (): TicketFilters => ({
  status: "",
  prioridade: "",
  origem: "",
  somente_atrasados: false,
  instrument_id: "",
  responsavel_user_id: "",
  q: ""
});

const emptyTicketForm = (): TicketForm => ({
  titulo: "",
  descricao: "",
  prioridade: "MEDIA",
  prazo_alvo: "",
  instrument_id: "",
  instrumento_informado: "",
  responsavel_user_id: ""
});

const emptyInstrumentForm = (): InstrumentForm => ({
  proposta: "",
  instrumento: "",
  objeto: "",
  valor_repasse: formatCurrencyInput(0),
  valor_contrapartida: formatCurrencyInput(0),
  data_cadastro: todayDate(),
  data_assinatura: "",
  vigencia_inicio: todayDate(),
  vigencia_fim: todayDate(),
  data_prestacao_contas: "",
  data_dou: "",
  concedente: "",
  banco: "",
  agencia: "",
  conta: "",
  fluxo_tipo: "OBRA",
  convenete_id: "",
  status: "EM_ELABORACAO",
  responsavel: "",
  orgao_executor: "",
  observacoes: ""
});

const emptyConveneteForm = (): ConveneteForm => ({
  nome: "",
  cnpj: "",
  endereco: "",
  bairro: "",
  cep: "",
  uf: "",
  cidade: "",
  tel: "",
  email: ""
});

const emptyAdminUserForm = (): AdminUserForm => ({
  nome: "",
  email: "",
  senha: "",
  role: "CONSULTA"
});

const readStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<User>;
    if (!parsed || typeof parsed.id !== "number" || typeof parsed.nome !== "string" || typeof parsed.email !== "string") {
      return null;
    }
    return {
      id: parsed.id,
      nome: parsed.nome,
      email: parsed.email,
      role: (parsed.role as User["role"]) ?? "CONSULTA",
      avatar_url: parsed.avatar_url ?? null
    };
  } catch {
    return null;
  }
};

const asOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const asOptionalNumber = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseCurrencyInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits === "") {
    return 0;
  }

  return Number(digits) / 100;
};

const formatCurrencyInput = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const normalizeCurrencyInput = (value: string) => formatCurrencyInput(parseCurrencyInput(value));

const calculateRepassePercentage = (valorJaRepassado: number, valorRepasse: number) => {
  if (valorRepasse <= 0) {
    return 0;
  }

  const percentage = (valorJaRepassado / valorRepasse) * 100;
  return Math.max(0, Math.min(100, percentage));
};

const withLoadedRepasses = async (authToken: string, instrument: Instrument): Promise<Instrument> => {
  try {
    const response = await listInstrumentRepasses(authToken, instrument.id);
    return {
      ...instrument,
      repasses: response.itens ?? []
    };
  } catch {
    return {
      ...instrument,
      repasses: instrument.repasses ?? []
    };
  }
};

const toPayload = (form: InstrumentForm): InstrumentPayload => {
  const valorRepasse = parseCurrencyInput(form.valor_repasse);
  const valorContrapartida = parseCurrencyInput(form.valor_contrapartida);

  if (Number.isNaN(valorRepasse) || Number.isNaN(valorContrapartida)) {
    throw new Error("Valores de repasse/contrapartida invalidos.");
  }

  if (form.vigencia_fim < form.vigencia_inicio) {
    throw new Error("Vigencia fim deve ser maior ou igual a vigencia inicio.");
  }

  if (form.data_assinatura && form.data_assinatura > todayDate()) {
    throw new Error("Data de assinatura nao pode ser futura.");
  }

  return {
    proposta: form.proposta.trim(),
    instrumento: form.instrumento.trim(),
    objeto: form.objeto.trim(),
    valor_repasse: valorRepasse,
    valor_contrapartida: valorContrapartida,
    data_cadastro: form.data_cadastro,
    data_assinatura: asOptional(form.data_assinatura),
    vigencia_inicio: form.vigencia_inicio,
    vigencia_fim: form.vigencia_fim,
    data_prestacao_contas: asOptional(form.data_prestacao_contas),
    data_dou: asOptional(form.data_dou),
    concedente: form.concedente.trim(),
    banco: asOptional(form.banco),
    agencia: asOptional(form.agencia),
    conta: asOptional(form.conta),
    fluxo_tipo: form.fluxo_tipo,
    convenete_id: asOptionalNumber(form.convenete_id),
    status: form.status,
    responsavel: asOptional(form.responsavel),
    orgao_executor: asOptional(form.orgao_executor),
    observacoes: asOptional(form.observacoes)
  };
};

const fromInstrumentToForm = (item: Instrument): InstrumentForm => ({
  proposta: item.proposta,
  instrumento: item.instrumento,
  objeto: item.objeto,
  valor_repasse: formatCurrencyInput(item.valor_repasse),
  valor_contrapartida: formatCurrencyInput(item.valor_contrapartida),
  data_cadastro: item.data_cadastro ?? todayDate(),
  data_assinatura: item.data_assinatura ?? "",
  vigencia_inicio: item.vigencia_inicio ?? todayDate(),
  vigencia_fim: item.vigencia_fim ?? todayDate(),
  data_prestacao_contas: item.data_prestacao_contas ?? "",
  data_dou: item.data_dou ?? "",
  concedente: item.concedente,
  banco: item.banco ?? "",
  agencia: item.agencia ?? "",
  conta: item.conta ?? "",
  fluxo_tipo: item.fluxo_tipo,
  convenete_id: item.convenete_id ? String(item.convenete_id) : "",
  status: item.status,
  responsavel: item.responsavel ?? "",
  orgao_executor: item.orgao_executor ?? "",
  observacoes: item.observacoes ?? ""
});

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const toCsvCell = (value: string | number | boolean | null | undefined) => {
  const safe = String(value ?? "").replace(/"/g, '""');
  return `"${safe}"`;
};

const exportCsv = (items: Instrument[]) => {
  const columns = [
    "id",
    "proposta",
    "instrumento",
    "status",
    "concedente",
    "valor_repasse",
    "valor_contrapartida",
    "valor_total",
    "vigencia_inicio",
    "vigencia_fim",
    "responsavel",
    "ativo"
  ] as const;
  type CsvColumn = (typeof columns)[number];

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = items.map((item) => {
    const row = item as unknown as Record<CsvColumn, string | number | boolean | null | undefined>;
    return columns.map((col) => toCsvCell(row[col])).join(";");
  });
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `instrumentos-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportExcel = (items: Instrument[]) => {
  const rows = items
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.proposta}</td><td>${item.instrumento}</td><td>${item.status}</td><td>${item.concedente}</td><td>${item.valor_total}</td><td>${item.vigencia_fim ?? ""}</td><td>${item.ativo ? "SIM" : "NAO"}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table border="1"><thead><tr><th>ID</th><th>Proposta</th><th>Instrumento</th><th>Status</th><th>Concedente</th><th>Valor Total</th><th>Vigencia Fim</th><th>Ativo</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `instrumentos-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportRepasseReportCsv = (report: RepasseReportResponse) => {
  const columns = [
    "id",
    "instrumento_id",
    "proposta",
    "instrumento",
    "data_repasse",
    "valor_repasse",
    "empresa_vencedora"
  ] as const;
  type CsvColumn = (typeof columns)[number];

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = report.repasses.map((item) => {
    const row = item as unknown as Record<CsvColumn, string | number | null>;
    return columns.map((col) => toCsvCell(row[col])).join(";");
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-repasses-${report.filtros.convenete_id}-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportRepasseReportExcel = (report: RepasseReportResponse) => {
  const repasseRows = report.repasses
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.instrumento_id}</td><td>${item.proposta}</td><td>${item.instrumento}</td><td>${item.data_repasse}</td><td>${item.valor_repasse}</td><td>${item.empresa_vencedora ?? ""}</td></tr>`
    )
    .join("");

  const instrumentoRows = report.instrumentos
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.proposta}</td><td>${item.instrumento}</td><td>${item.status}</td><td>${item.orgao_concedente}</td><td>${item.banco ?? ""}</td><td>${item.agencia ?? ""}</td><td>${item.conta ?? ""}</td><td>${item.data_prestacao_contas ?? ""}</td><td>${item.empresa_vencedora ?? ""}</td><td>${item.valor_pactuado}</td><td>${item.valor_ja_repassado}</td><td>${item.valor_repassado_periodo}</td><td>${item.saldo_pactuado}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><h3>Resumo</h3><table border="1"><tbody><tr><td>Convenete</td><td>${report.filtros.convenete_nome}</td></tr><tr><td>CNPJ</td><td>${report.filtros.convenete_cnpj}</td></tr><tr><td>Valor repassado no periodo</td><td>${report.kpis.valor_repassado_periodo}</td></tr><tr><td>Quantidade de repasses</td><td>${report.kpis.quantidade_repasses}</td></tr><tr><td>% repassado</td><td>${report.kpis.percentual_repassado.toFixed(2)}%</td></tr></tbody></table><h3>Repasses</h3><table border="1"><thead><tr><th>ID</th><th>Instrumento ID</th><th>Proposta</th><th>Instrumento</th><th>Data</th><th>Valor</th><th>Empresa vencedora</th></tr></thead><tbody>${repasseRows}</tbody></table><h3>Instrumentos</h3><table border="1"><thead><tr><th>ID</th><th>Proposta</th><th>Instrumento</th><th>Status</th><th>Orgao concedente</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Prestacao de contas</th><th>Empresa vencedora</th><th>Valor pactuado</th><th>Valor ja repassado</th><th>Repassado no periodo</th><th>Saldo</th></tr></thead><tbody>${instrumentoRows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-repasses-${report.filtros.convenete_id}-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportRepasseReportPdf = (report: RepasseReportResponse, mode: ReportPdfMode) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const repasseRows = report.repasses
    .map(
      (item) =>
        `<tr><td>${item.data_repasse}</td><td>${item.instrumento}</td><td style="text-align:right">${formatCurrency(item.valor_repasse)}</td><td>${item.empresa_vencedora ?? "-"}</td></tr>`
    )
    .join("");
  const instrumentRows = report.instrumentos
    .map(
      (item) =>
        `<tr><td>${item.instrumento}</td><td>${item.status}</td><td>${item.orgao_concedente}</td><td>${item.banco ?? "-"}</td><td>${item.agencia ?? "-"}</td><td>${item.conta ?? "-"}</td><td>${item.data_prestacao_contas ?? "-"}</td><td style="text-align:right">${formatCurrency(item.valor_pactuado)}</td><td style="text-align:right">${formatCurrency(item.valor_ja_repassado)}</td><td style="text-align:right">${formatCurrency(item.saldo_pactuado)}</td></tr>`
    )
    .join("");

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio de repasses</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body><div class="report-head"><img src="/api/v1/public/brand-logo" alt="NC Convenios" /><h1>Relatorio de repasses (${mode})</h1></div><p><strong>Convenete:</strong> ${report.filtros.convenete_nome} (${report.filtros.convenete_cnpj})</p><p><strong>Periodo:</strong> ${report.filtros.data_de ?? "inicio"} ate ${report.filtros.data_ate ?? "hoje"}</p><div class="kpi"><div><strong>Repassado no periodo</strong><br/>${formatCurrency(report.kpis.valor_repassado_periodo)}</div><div><strong>Qtd repasses</strong><br/>${report.kpis.quantidade_repasses}</div><div><strong>Valor pactuado</strong><br/>${formatCurrency(report.kpis.valor_pactuado)}</div><div><strong>% repassado</strong><br/>${report.kpis.percentual_repassado.toFixed(2)}%</div></div>${mode === "analitico" ? `<h2>Instrumentos</h2><table><thead><tr><th>Instrumento</th><th>Status</th><th>Orgao concedente</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Prestacao de contas</th><th>Pactuado</th><th>Ja repassado</th><th>Saldo</th></tr></thead><tbody>${instrumentRows}</tbody></table>` : ""}<h2>Repasses</h2><table><thead><tr><th>Data</th><th>Instrumento</th><th>Valor</th><th>Empresa vencedora</th></tr></thead><tbody>${repasseRows}</tbody></table><script>window.print()</script></body></html>`);
  popup.document.close();
};

const exportObraReportCsv = (report: ObraReportResponse) => {
  const columns = [
    "id",
    "proposta",
    "instrumento",
    "objeto",
    "status",
    "orgao_concedente",
    "banco",
    "agencia",
    "conta",
    "data_prestacao_contas",
    "vigencia_fim",
    "dias_para_vigencia_fim",
    "percentual_obra",
    "valor_pactuado",
    "valor_ja_repassado",
    "valor_boletins_periodo",
    "valor_repasses_periodo",
    "ultimo_boletim_data",
    "ultimo_boletim_valor",
    "risco"
  ] as const;
  type CsvColumn = (typeof columns)[number];

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = report.instrumentos.map((item) => {
    const row = item as unknown as Record<CsvColumn, string | number | null>;
    return columns.map((col) => toCsvCell(row[col])).join(";");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-obras-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportObraReportExcel = (report: ObraReportResponse) => {
  const instrumentoRows = report.instrumentos
    .map(
      (item) =>
        `<tr><td>${item.id}</td><td>${item.proposta}</td><td>${item.instrumento}</td><td>${item.objeto}</td><td>${item.status}</td><td>${item.orgao_concedente}</td><td>${item.banco ?? ""}</td><td>${item.agencia ?? ""}</td><td>${item.conta ?? ""}</td><td>${item.data_prestacao_contas ?? ""}</td><td>${item.vigencia_fim}</td><td>${item.dias_para_vigencia_fim}</td><td>${item.percentual_obra}</td><td>${item.valor_pactuado}</td><td>${item.valor_ja_repassado}</td><td>${item.valor_boletins_periodo}</td><td>${item.valor_repasses_periodo}</td><td>${item.ultimo_boletim_data ?? ""}</td><td>${item.ultimo_boletim_valor ?? ""}</td><td>${item.risco}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><h3>Resumo</h3><table border="1"><tbody><tr><td>Obras monitoradas</td><td>${report.kpis.obras_monitoradas}</td></tr><tr><td>% medio da obra</td><td>${report.kpis.percentual_medio_obra.toFixed(2)}%</td></tr><tr><td>Boletins no periodo</td><td>${report.kpis.valor_total_boletins_periodo}</td></tr><tr><td>Repasses no periodo</td><td>${report.kpis.valor_total_repasses_periodo}</td></tr><tr><td>Risco alto</td><td>${report.kpis.obras_risco_alto}</td></tr></tbody></table><h3>Obras</h3><table border="1"><thead><tr><th>ID</th><th>Proposta</th><th>Instrumento</th><th>Objeto</th><th>Status</th><th>Orgao concedente</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Prestacao contas</th><th>Vigencia fim</th><th>Dias vigencia fim</th><th>% obra</th><th>Pactuado</th><th>Ja repassado</th><th>Boletins periodo</th><th>Repasses periodo</th><th>Ultimo boletim data</th><th>Ultimo boletim valor</th><th>Risco</th></tr></thead><tbody>${instrumentoRows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-obras-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportObraReportPdf = (report: ObraReportResponse, mode: ReportPdfMode) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const instrumentRows = report.instrumentos
    .map(
      (item) =>
        `<tr><td>${item.instrumento}</td><td>${item.objeto}</td><td>${item.status}</td><td>${item.percentual_obra.toFixed(2)}%</td><td>${item.dias_para_vigencia_fim}</td><td>${item.risco}</td><td style="text-align:right">${formatCurrency(item.valor_boletins_periodo)}</td><td style="text-align:right">${formatCurrency(item.valor_repasses_periodo)}</td></tr>`
    )
    .join("");

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio de obras</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left}.kpi{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body><div class="report-head"><img src="/api/v1/public/brand-logo" alt="NC Convenios" /><h1>Relatorio de obras (${mode})</h1></div><p><strong>Periodo:</strong> ${report.filtros.data_de ?? "inicio"} ate ${report.filtros.data_ate ?? "hoje"}</p><div class="kpi"><div><strong>Obras monitoradas</strong><br/>${report.kpis.obras_monitoradas}</div><div><strong>% medio da obra</strong><br/>${report.kpis.percentual_medio_obra.toFixed(2)}%</div><div><strong>Boletins no periodo</strong><br/>${formatCurrency(report.kpis.valor_total_boletins_periodo)}</div><div><strong>Repasses no periodo</strong><br/>${formatCurrency(report.kpis.valor_total_repasses_periodo)}</div><div><strong>Risco alto</strong><br/>${report.kpis.obras_risco_alto}</div></div>${mode === "analitico" ? `<h2>Instrumentos</h2><table><thead><tr><th>Instrumento</th><th>Objeto</th><th>Status</th><th>% obra</th><th>Dias vigencia fim</th><th>Risco</th><th>Boletins periodo</th><th>Repasses periodo</th></tr></thead><tbody>${instrumentRows}</tbody></table>` : ""}<script>window.print()</script></body></html>`);
  popup.document.close();
};

export default function App() {
  const logoSrc = "/logo-gestconv-novo-semfundo-removebg-preview.png";

  const [healthStatus, setHealthStatus] = useState<"checking" | "ok" | "error">("checking");
  const [technicalHealth, setTechnicalHealth] = useState<TechnicalHealthState>({
    backendVersion: "desconhecida",
    reportRouteStatus: "checking",
    lastCheckedAt: null
  });
  const [activeView, setActiveView] = useState<MenuView>(() =>
    readInstrumentIdFromPath(window.location.pathname) ? "instrumentos" : "dashboard"
  );
  const [instrumentPageId, setInstrumentPageId] = useState<number | null>(() =>
    readInstrumentIdFromPath(window.location.pathname)
  );

  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) ?? "");
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [filters, setFilters] = useState<InstrumentFilters>(() => blankFilters());
  const [form, setForm] = useState<InstrumentForm>(() => emptyInstrumentForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCreateInstrumentForm, setShowCreateInstrumentForm] = useState(false);

  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");

  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [overviewItems, setOverviewItems] = useState<Instrument[]>([]);
  const [alerts, setAlerts] = useState<DeadlineAlertItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditInstrumentId, setAuditInstrumentId] = useState("");
  const [auditAction, setAuditAction] = useState<AuditAction | "">("");
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistSummary, setChecklistSummary] = useState<ChecklistSummary | null>(null);
  const [checklistDocName, setChecklistDocName] = useState("");
  const [checklistRequired, setChecklistRequired] = useState(true);
  const [checklistNote, setChecklistNote] = useState("");
  const [checklistStage, setChecklistStage] = useState<WorkflowStage>("PROPOSTA");
  const [externalLinkValidityDays, setExternalLinkValidityDays] = useState<number>(7);
  const [activeWorkflowStage, setActiveWorkflowStage] = useState<WorkflowStage | null>(null);
  const [busyChecklistItemId, setBusyChecklistItemId] = useState<number | null>(null);
  const [busyExternalLinkItemId, setBusyExternalLinkItemId] = useState<number | null>(null);
  const [stageFollowUps, setStageFollowUps] = useState<Record<WorkflowStage, StageFollowUp[]>>(() =>
    emptyStageFollowUps()
  );
  const [stageFollowUpText, setStageFollowUpText] = useState("");
  const [stageFollowUpFiles, setStageFollowUpFiles] = useState<File[]>([]);
  const [isSavingStageFollowUp, setIsSavingStageFollowUp] = useState(false);
  const [isDraggingStageFiles, setIsDraggingStageFiles] = useState(false);
  const [stageFollowUpModalStage, setStageFollowUpModalStage] = useState<WorkflowStage | null>(null);
  const [stageFollowUpFilter, setStageFollowUpFilter] = useState<StageFollowUpFilter>("TODOS");
  const [expandedFollowUpIds, setExpandedFollowUpIds] = useState<number[]>([]);
  const [expandedChecklistAttachmentItemIds, setExpandedChecklistAttachmentItemIds] = useState<number[]>([]);
  const [workProgress, setWorkProgress] = useState<WorkProgress | null>(null);
  const [obraPercentual, setObraPercentual] = useState("0");
  const [boletimData, setBoletimData] = useState(todayDate());
  const [boletimValor, setBoletimValor] = useState(formatCurrencyInput(0));
  const [boletimPercentual, setBoletimPercentual] = useState("");
  const [boletimObservacao, setBoletimObservacao] = useState("");
  const [showRepassePanel, setShowRepassePanel] = useState(false);
  const [showWorkProgressPanel, setShowWorkProgressPanel] = useState(false);
  const [repasseValorInput, setRepasseValorInput] = useState(formatCurrencyInput(0));
  const [repasseDataInput, setRepasseDataInput] = useState(todayDate());
  const [empresaVencedoraInput, setEmpresaVencedoraInput] = useState("");

  const [convenetes, setConvenetes] = useState<Convenete[]>([]);
  const [ticketFilters, setTicketFilters] = useState<TicketFilters>(() => emptyTicketFilters());
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketBoardTab, setTicketBoardTab] = useState<TicketBoardTab>(() => {
    const stored = localStorage.getItem(TICKET_TAB_KEY);
    if (stored === "abertos" || stored === "resolvidos" || stored === "cancelados") {
      return stored;
    }
    return "abertos";
  });
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketForm, setTicketForm] = useState<TicketForm>(() => emptyTicketForm());
  const [ticketResolutionReason, setTicketResolutionReason] = useState("");
  const [ticketCommentText, setTicketCommentText] = useState("");
  const [ticketAssignableUsers, setTicketAssignableUsers] = useState<Array<{ id: number; nome: string; email: string; role: Role }>>([]);
  const [relatorioTab, setRelatorioTab] = useState<RelatorioTab>("repasses");
  const [reportFilters, setReportFilters] = useState<ReportFilters>(() => emptyReportFilters());
  const [reportData, setReportData] = useState<RepasseReportResponse | null>(null);
  const [obraReportFilters, setObraReportFilters] = useState<ObraReportFilters>(() => emptyObraReportFilters());
  const [obraReportData, setObraReportData] = useState<ObraReportResponse | null>(null);
  const [conveneteForm, setConveneteForm] = useState<ConveneteForm>(() => emptyConveneteForm());
  const [editingConveneteId, setEditingConveneteId] = useState<number | null>(null);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [adminUserForm, setAdminUserForm] = useState<AdminUserForm>(() => emptyAdminUserForm());
  const [editingManagedUserId, setEditingManagedUserId] = useState<number | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const isAuthenticated = Boolean(token && user);
  const canManageInstruments = user?.role === "ADMIN" || user?.role === "GESTOR";
  const canDeactivateInstruments = user?.role === "ADMIN";
  const isAdmin = user?.role === "ADMIN";
  const isInstrumentProfileView = activeView === "instrumentos" && instrumentPageId !== null;

  const sortedInstruments = useMemo(() => [...instruments].sort((a, b) => a.id - b.id), [instruments]);
  const concedenteOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of overviewItems) {
      const value = item.concedente.trim();
      if (value) {
        values.add(value);
      }
    }
    for (const item of sortedInstruments) {
      const value = item.concedente.trim();
      if (value) {
        values.add(value);
      }
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [overviewItems, sortedInstruments]);
  const conveneteNameById = useMemo(() => {
    return new Map(convenetes.map((item) => [item.id, item.nome]));
  }, [convenetes]);
  const profileInstrument = useMemo(() => {
    if (instrumentPageId === null) {
      return null;
    }

    const byList = sortedInstruments.find((item) => item.id === instrumentPageId);
    if (byList) {
      return byList;
    }

    if (selectedInstrument?.id === instrumentPageId) {
      return selectedInstrument;
    }

    return null;
  }, [instrumentPageId, sortedInstruments, selectedInstrument]);
  const currentFlowType: InstrumentFlowType = profileInstrument?.fluxo_tipo ?? "OBRA";
  const isEditingProfileInstrument = Boolean(
    canManageInstruments && isInstrumentProfileView && profileInstrument && editingId === profileInstrument.id
  );
  const stageLabels = getStageLabels(currentFlowType);
  const repassePercentualAtual = profileInstrument
    ? calculateRepassePercentage(profileInstrument.valor_ja_repassado, profileInstrument.valor_repasse)
    : 0;
  const profileInstrumentRepasses = profileInstrument?.repasses ?? [];
  const reportInstrumentOptions = useMemo(() => {
    if (reportFilters.convenete_id.trim() === "") {
      return [];
    }

    const conveneteId = Number(reportFilters.convenete_id);
    return sortedInstruments.filter((item) => item.convenete_id === conveneteId);
  }, [reportFilters.convenete_id, sortedInstruments]);
  const obraReportInstrumentOptions = useMemo(() => {
    const obraItems = sortedInstruments.filter((item) => item.fluxo_tipo === "OBRA");
    if (obraReportFilters.convenete_id.trim() === "") {
      return obraItems;
    }

    const conveneteId = Number(obraReportFilters.convenete_id);
    return obraItems.filter((item) => item.convenete_id === conveneteId);
  }, [obraReportFilters.convenete_id, sortedInstruments]);

  const dashboard = useMemo(() => {
    const totalRegistros = overviewItems.length;
    const ativos = overviewItems.filter((item) => item.ativo).length;
    const valorTotal = overviewItems.reduce((acc, item) => acc + item.valor_total, 0);
    const porStatus = STATUS_OPTIONS.map((status) => ({
      status,
      quantidade: overviewItems.filter((item) => item.status === status).length
    }));

    return {
      totalRegistros,
      ativos,
      inativos: totalRegistros - ativos,
      valorTotal,
      alertas: alerts.length,
      porStatus
    };
  }, [overviewItems, alerts]);

  const dashboardInsights = useMemo(() => {
    const totalRepassado = overviewItems.reduce((acc, item) => acc + item.valor_ja_repassado, 0);
    const percentualMedioRepassado =
      overviewItems.length > 0
        ? overviewItems.reduce((acc, item) => acc + item.percentual_repassado, 0) / overviewItems.length
        : 0;

    const flowTypes: InstrumentFlowType[] = [
      "OBRA",
      "AQUISICAO_EQUIPAMENTOS",
      "EVENTOS"
    ];
    const porFluxo: Array<{ fluxo: InstrumentFlowType; quantidade: number }> = flowTypes.map((fluxo) => ({
      fluxo,
      quantidade: overviewItems.filter((item) => item.fluxo_tipo === fluxo).length
    }));

    const concedenteMap = new Map<string, number>();
    for (const item of overviewItems) {
      const key = item.concedente.trim();
      concedenteMap.set(key, (concedenteMap.get(key) ?? 0) + 1);
    }
    const topConcedentes = Array.from(concedenteMap.entries())
      .map(([concedente, quantidade]) => ({ concedente, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    const alertasCriticos = [...alerts]
      .sort((a, b) => {
        const aMin = Math.min(a.dias_para_vigencia_fim, a.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
        const bMin = Math.min(b.dias_para_vigencia_fim, b.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
        return aMin - bMin;
      })
      .slice(0, 5);

    const obrasAtivas = overviewItems.filter((item) => item.fluxo_tipo === "OBRA" && item.ativo);
    const obrasComBaixoRepasse = [...obrasAtivas]
      .sort((a, b) => a.percentual_repassado - b.percentual_repassado)
      .slice(0, 5);

    return {
      totalRepassado,
      percentualMedioRepassado,
      porFluxo,
      topConcedentes,
      alertasCriticos,
      obrasComBaixoRepasse,
      prestacaoPendente: overviewItems.filter((item) => item.status === "PRESTACAO_PENDENTE").length,
      emExecucao: overviewItems.filter((item) => item.status === "EM_EXECUCAO").length,
      vencidos: overviewItems.filter((item) => item.status === "VENCIDO").length,
      usuarios: managedUsers.length,
      logs: auditLogs.length
    };
  }, [overviewItems, alerts, managedUsers, auditLogs]);

  const openTickets = useMemo(
    () => tickets.filter((item) => item.status === "ABERTO" || item.status === "EM_ANDAMENTO"),
    [tickets]
  );
  const resolvedTickets = useMemo(() => tickets.filter((item) => item.status === "RESOLVIDO"), [tickets]);
  const canceledTickets = useMemo(() => tickets.filter((item) => item.status === "CANCELADO"), [tickets]);
  const visibleTickets = useMemo(() => {
    if (ticketBoardTab === "resolvidos") {
      return resolvedTickets;
    }
    if (ticketBoardTab === "cancelados") {
      return canceledTickets;
    }
    return openTickets;
  }, [ticketBoardTab, openTickets, resolvedTickets, canceledTickets]);

  const refreshTechnicalHealth = async () => {
    let backendVersion = "desconhecida";

    try {
      const health = await healthCheck();
      setHealthStatus("ok");
      backendVersion = health.version?.trim() ? health.version : "desconhecida";
    } catch {
      setHealthStatus("error");
      setTechnicalHealth((prev) => ({
        ...prev,
        reportRouteStatus: "error",
        lastCheckedAt: new Date().toISOString()
      }));
      return;
    }

    if (!token) {
      setTechnicalHealth({
        backendVersion,
        reportRouteStatus: "checking",
        lastCheckedAt: new Date().toISOString()
      });
      return;
    }

    try {
      const smokeResponse = await fetch("/api/v1/relatorios/repasses?convenete_id=1", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const routeStatus: TechnicalRouteStatus = smokeResponse.status === 404 ? "missing" : "ok";
      setTechnicalHealth({
        backendVersion,
        reportRouteStatus: routeStatus,
        lastCheckedAt: new Date().toISOString()
      });
    } catch {
      setTechnicalHealth({
        backendVersion,
        reportRouteStatus: "error",
        lastCheckedAt: new Date().toISOString()
      });
    }
  };

  useEffect(() => {
    void refreshTechnicalHealth();
  }, [token]);

  const persistAuth = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const clearAuth = () => {
    setToken("");
    setUser(null);
    setInstruments([]);
    setOverviewItems([]);
    setAlerts([]);
    setSelectedInstrument(null);
    setChecklistItems([]);
    setChecklistSummary(null);
    setStageFollowUps(emptyStageFollowUps());
    setStageFollowUpText("");
    setStageFollowUpFiles([]);
    setStageFollowUpModalStage(null);
    setStageFollowUpFilter("TODOS");
    setExpandedFollowUpIds([]);
    setWorkProgress(null);
    setChecklistStage("PROPOSTA");
    setActiveWorkflowStage(null);
    setExpandedChecklistAttachmentItemIds([]);
    setBusyExternalLinkItemId(null);
    setObraPercentual("0");
    setBoletimData(todayDate());
    setBoletimValor(formatCurrencyInput(0));
    setBoletimPercentual("");
    setBoletimObservacao("");
    setShowRepassePanel(false);
    setShowWorkProgressPanel(false);
    setRepasseValorInput(formatCurrencyInput(0));
    setRepasseDataInput(todayDate());
    setRelatorioTab("repasses");
    setReportFilters(emptyReportFilters());
    setReportData(null);
    setObraReportFilters(emptyObraReportFilters());
    setObraReportData(null);
    setTicketFilters(emptyTicketFilters());
    setTickets([]);
    setTicketBoardTab("abertos");
    setSelectedTicket(null);
    setTicketForm(emptyTicketForm());
    setTicketResolutionReason("");
    setTicketCommentText("");
    setTicketAssignableUsers([]);
    setEditingId(null);
    setShowCreateInstrumentForm(false);
    setForm(emptyInstrumentForm());
    setConvenetes([]);
    setEditingConveneteId(null);
    setConveneteForm(emptyConveneteForm());
    setManagedUsers([]);
    setEditingManagedUserId(null);
    setAdminUserForm(emptyAdminUserForm());
    setFilters(blankFilters());
    setInstrumentPageId(null);
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TICKET_TAB_KEY);
  };

  useEffect(() => {
    const onAuthExpired = () => {
      clearAuth();
      setMessage("Sessao expirada. Faca login novamente.");
    };

    window.addEventListener("gestconv:auth-expired", onAuthExpired);
    return () => window.removeEventListener("gestconv:auth-expired", onAuthExpired);
  }, []);

  useEffect(() => {
    localStorage.setItem(TICKET_TAB_KEY, ticketBoardTab);
  }, [ticketBoardTab]);

  useEffect(() => {
    if (!selectedTicket) {
      return;
    }
    const stillVisible = visibleTickets.some((item) => item.id === selectedTicket.id);
    if (!stillVisible) {
      setSelectedTicket(null);
    }
  }, [visibleTickets, selectedTicket]);

  const navigateToInstrumentList = () => {
    setInstrumentPageId(null);
    setChecklistItems([]);
    setChecklistSummary(null);
    setStageFollowUps(emptyStageFollowUps());
    setStageFollowUpText("");
    setStageFollowUpFiles([]);
    setStageFollowUpModalStage(null);
    setStageFollowUpFilter("TODOS");
    setExpandedFollowUpIds([]);
    setExpandedChecklistAttachmentItemIds([]);
    setWorkProgress(null);
    setShowRepassePanel(false);
    setShowWorkProgressPanel(false);
    setActiveWorkflowStage(null);
    setBusyExternalLinkItemId(null);
    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
    }
  };

  const navigateToInstrumentProfile = (id: number) => {
    const nextPath = `/instrumentos/${id}`;
    setInstrumentPageId(id);
    setActiveWorkflowStage(null);
    setExpandedChecklistAttachmentItemIds([]);
    setActiveView("instrumentos");
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
  };

  const loadInstruments = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const items = await listInstruments(currentToken, filters);
    setInstruments(items);
    if (selectedInstrument) {
      setSelectedInstrument(items.find((item) => item.id === selectedInstrument.id) ?? null);
    }
  };

  const loadDashboard = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const base = blankFilters();
    const [ativos, inativos, alertas] = await Promise.all([
      listInstruments(currentToken, { ...base, ativo: "true" }),
      listInstruments(currentToken, { ...base, ativo: "false" }),
      listDeadlineAlerts(currentToken, 30)
    ]);

    setOverviewItems([...ativos, ...inativos]);
    setAlerts(alertas.itens);
  };

  const loadAuditTrail = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const logs = await listAuditLogs(currentToken, {
      instrumento_id: auditInstrumentId.trim() === "" ? undefined : Number(auditInstrumentId),
      acao: auditAction || undefined,
      limite: 150
    });
    setAuditLogs(logs);
  };

  const loadConvenetes = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const items = await listConvenetes(currentToken);
    setConvenetes(items);
  };

  const loadRepasseReport = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    if (reportFilters.convenete_id.trim() === "") {
      setReportData(null);
      return;
    }

    const report = await getRepasseReport(currentToken, {
      convenete_id: Number(reportFilters.convenete_id),
      instrumento_id: reportFilters.instrumento_id.trim() === "" ? undefined : Number(reportFilters.instrumento_id),
      data_de: reportFilters.data_de || undefined,
      data_ate: reportFilters.data_ate || undefined
    });
    setReportData(report);
  };

  const loadObraReport = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const report = await getObraReport(currentToken, {
      convenete_id: obraReportFilters.convenete_id.trim() === "" ? undefined : Number(obraReportFilters.convenete_id),
      instrumento_id: obraReportFilters.instrumento_id.trim() === "" ? undefined : Number(obraReportFilters.instrumento_id),
      status: obraReportFilters.status || undefined,
      ativo: obraReportFilters.ativo === "true",
      data_de: obraReportFilters.data_de || undefined,
      data_ate: obraReportFilters.data_ate || undefined
    });

    setObraReportData(report);
  };

  const loadManagedUsers = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken || !isAdmin) {
      setManagedUsers([]);
      return;
    }

    const items = await listUsersAdmin(currentToken);
    setManagedUsers(items);
  };

  const loadTickets = async (authToken?: string, filtersOverride?: TicketFilters) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      setTickets([]);
      return;
    }

    const sourceFilters = filtersOverride ?? ticketFilters;

    const items = await listTickets(currentToken, {
      status: sourceFilters.status || undefined,
      prioridade: sourceFilters.prioridade || undefined,
      origem: sourceFilters.origem || undefined,
      somente_atrasados: sourceFilters.somente_atrasados,
      instrument_id: sourceFilters.instrument_id.trim() === "" ? undefined : Number(sourceFilters.instrument_id),
      responsavel_user_id:
        sourceFilters.responsavel_user_id.trim() === "" ? undefined : Number(sourceFilters.responsavel_user_id),
      q: sourceFilters.q.trim() === "" ? undefined : sourceFilters.q.trim()
    });
    setTickets(items);
  };

  const loadTicketAssignableUsers = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken || !canManageInstruments) {
      setTicketAssignableUsers([]);
      return;
    }

    const result = await listTicketAssignableUsers(currentToken);
    setTicketAssignableUsers(result.itens);
  };

  const loadChecklist = async (instrumentId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const data = await getInstrumentChecklist(currentToken, instrumentId);
    setChecklistItems(
      data.itens.map((item) => ({
        ...item,
        solicitacao_externa: item.solicitacao_externa ?? null,
        anexos_externos: item.anexos_externos ?? []
      }))
    );
    setExpandedChecklistAttachmentItemIds([]);
    setChecklistSummary(data.resumo);
  };

  const loadAllStageFollowUps = async (instrumentId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const responses = await Promise.all(WORKFLOW_STAGES.map((stage) => listStageFollowUps(currentToken, instrumentId, stage)));
    const next = emptyStageFollowUps();
    WORKFLOW_STAGES.forEach((stage, index) => {
      next[stage] = responses[index].itens;
    });
    setStageFollowUps(next);
  };

  const loadWorkProgress = async (instrumentId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const data = await getWorkProgress(currentToken, instrumentId);
    setWorkProgress(data);
    setObraPercentual(String(data.percentual_obra));
  };

  const refreshData = async (authToken?: string) => {
    setIsBusy(true);
    setMessage("");
    try {
      await Promise.all([loadInstruments(authToken), loadDashboard(authToken), loadAuditTrail(authToken), loadTickets(authToken)]);
      try {
        await loadConvenetes(authToken);
      } catch {
        // Intencionalmente ignorado para nao bloquear o modulo de instrumentos.
      }
      try {
        await loadManagedUsers(authToken);
      } catch {
        // Intencionalmente ignorado para nao bloquear outras telas.
      }
      try {
        await loadTicketAssignableUsers(authToken);
      } catch {
        // Intencionalmente ignorado para nao bloquear outras telas.
      }
      setMessage("Dados atualizados com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar dados.");
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void refreshData();
  }, [isAuthenticated, isAdmin]);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      return;
    }

    getMyProfile(token)
      .then((profile) => {
        persistAuth(token, profile);
      })
      .catch(() => undefined);
  }, [token, isAuthenticated]);

  useEffect(() => {
    const onPopState = () => {
      const idFromPath = readInstrumentIdFromPath(window.location.pathname);
      setInstrumentPageId(idFromPath);
      if (idFromPath !== null) {
        setActiveView("instrumentos");
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || instrumentPageId === null || !token) {
      return;
    }

    const existing = instruments.find((item) => item.id === instrumentPageId);
    if (existing) {
      setSelectedInstrument(existing);
      return;
    }

    getInstrumentById(token, instrumentPageId)
      .then((item) => {
        setSelectedInstrument(item);
      })
      .catch(() => {
        setMessage("Instrumento nao encontrado.");
      });
  }, [instrumentPageId, isAuthenticated, token, instruments]);

  useEffect(() => {
    if (!isAuthenticated || instrumentPageId === null || !token) {
      setChecklistItems([]);
      setChecklistSummary(null);
      setStageFollowUps(emptyStageFollowUps());
      setStageFollowUpText("");
      setStageFollowUpFiles([]);
      setStageFollowUpModalStage(null);
      setStageFollowUpFilter("TODOS");
      setExpandedFollowUpIds([]);
      setWorkProgress(null);
      return;
    }

    Promise.all([
      loadChecklist(instrumentPageId, token),
      loadWorkProgress(instrumentPageId, token),
      loadAllStageFollowUps(instrumentPageId, token)
    ]).catch(
      (error) => {
        setMessage(error instanceof Error ? error.message : "Falha ao carregar acompanhamento do instrumento.");
      }
    );
  }, [instrumentPageId, isAuthenticated, token]);

  useEffect(() => {
    if (!profileInstrument) {
      setRepasseValorInput(formatCurrencyInput(0));
      setRepasseDataInput(todayDate());
      setEmpresaVencedoraInput("");
      return;
    }

    setRepasseValorInput(formatCurrencyInput(0));
    setRepasseDataInput(todayDate());
    setEmpresaVencedoraInput(profileInstrument.orgao_executor ?? "");
  }, [
    profileInstrument?.id,
    profileInstrument?.orgao_executor
  ]);

  useEffect(() => {
    setStageFollowUpText("");
    setStageFollowUpFiles([]);
    setStageFollowUpModalStage(null);
    setExpandedFollowUpIds([]);
  }, [activeWorkflowStage]);

  useEffect(() => {
    if (convenetes.length === 0) {
      return;
    }

    setReportFilters((prev) => {
      if (prev.convenete_id.trim() !== "") {
        return prev;
      }
      return {
        ...prev,
        convenete_id: String(convenetes[0].id)
      };
    });

    setObraReportFilters((prev) => {
      if (prev.convenete_id.trim() !== "") {
        return prev;
      }
      return {
        ...prev,
        convenete_id: String(convenetes[0].id)
      };
    });
  }, [convenetes]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "repasses") {
      return;
    }

    if (reportFilters.convenete_id.trim() === "" || reportData) {
      return;
    }

    void onApplyRepasseReportFilters();
  }, [activeView, isAuthenticated, relatorioTab, reportFilters.convenete_id, reportData]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "obras") {
      return;
    }

    if (obraReportData) {
      return;
    }

    void onApplyObraReportFilters();
  }, [activeView, isAuthenticated, relatorioTab, obraReportData]);

  useEffect(() => {
    if (reportFilters.instrumento_id.trim() === "") {
      return;
    }

    const selectedId = Number(reportFilters.instrumento_id);
    const stillAvailable = reportInstrumentOptions.some((item) => item.id === selectedId);
    if (!stillAvailable) {
      setReportFilters((prev) => ({ ...prev, instrumento_id: "" }));
      setReportData(null);
    }
  }, [reportFilters.instrumento_id, reportInstrumentOptions]);

  useEffect(() => {
    if (obraReportFilters.instrumento_id.trim() === "") {
      return;
    }

    const selectedId = Number(obraReportFilters.instrumento_id);
    const stillAvailable = obraReportInstrumentOptions.some((item) => item.id === selectedId);
    if (!stillAvailable) {
      setObraReportFilters((prev) => ({ ...prev, instrumento_id: "" }));
      setObraReportData(null);
    }
  }, [obraReportFilters.instrumento_id, obraReportInstrumentOptions]);

  const onToggleWorkflowStage = (stage: WorkflowStage) => {
    setActiveWorkflowStage((prev) => (prev === stage ? null : stage));
  };

  const onAddChecklistItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const nomeDocumento = checklistDocName.trim();
    if (nomeDocumento.length < 3) {
      setMessage("Informe um nome de documento com pelo menos 3 caracteres.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await addChecklistItem(token, instrumentPageId, {
        nome_documento: nomeDocumento,
        etapa: checklistStage,
        obrigatorio: checklistRequired,
        observacao: checklistNote.trim() || undefined
      });
      setChecklistDocName("");
      setChecklistRequired(true);
      setChecklistNote("");
      await loadChecklist(instrumentPageId);
      setMessage("Item adicionado ao checklist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao adicionar item no checklist.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeleteChecklistItem = async (itemId: number) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setBusyChecklistItemId(itemId);
    setMessage("");
    try {
      await deleteChecklistItem(token, instrumentPageId, itemId);
      await loadChecklist(instrumentPageId);
      setMessage("Item removido do checklist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover item do checklist.");
    } finally {
      setBusyChecklistItemId(null);
    }
  };

  const onUpdateChecklistItemStatus = async (itemId: number, status: ChecklistItemStatus) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setBusyChecklistItemId(itemId);
    setMessage("");
    try {
      await updateChecklistItem(token, instrumentPageId, itemId, { status });
      await loadChecklist(instrumentPageId);
      setMessage("Status do item atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar status do checklist.");
    } finally {
      setBusyChecklistItemId(null);
    }
  };

  const onGenerateChecklistExternalLink = async (itemId: number) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setBusyExternalLinkItemId(itemId);
    setMessage("");
    try {
      const created = await createChecklistExternalLink(token, instrumentPageId, itemId, externalLinkValidityDays);
      await navigator.clipboard.writeText(created.link_publico);
      await loadChecklist(instrumentPageId);
      setMessage("Link externo gerado e copiado para a area de transferencia.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar link externo.");
    } finally {
      setBusyExternalLinkItemId(null);
    }
  };

  const onCopyExternalLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(toAbsoluteUrl(url));
      setMessage("Link copiado.");
    } catch {
      setMessage("Nao foi possivel copiar automaticamente. Copie o link manualmente.");
    }
  };

  const onDeactivateChecklistExternalLink = async (itemId: number) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setBusyExternalLinkItemId(itemId);
    setMessage("");
    try {
      const response = await deactivateChecklistExternalLinkApi(token, instrumentPageId, itemId);
      await loadChecklist(instrumentPageId);
      setMessage(response.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao desativar link externo.");
    } finally {
      setBusyExternalLinkItemId(null);
    }
  };

  const onDownloadChecklistExternalAttachment = async (itemId: number, fileId: number, name: string) => {
    if (!token || instrumentPageId === null) {
      return;
    }

    try {
      await downloadChecklistExternalFile(token, instrumentPageId, itemId, fileId, name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao baixar anexo externo.");
    }
  };

  const onSaveStageFollowUp = async (stage: WorkflowStage) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    if (stageFollowUpText.trim().length === 0 && stageFollowUpFiles.length === 0) {
      setMessage("Informe um texto ou envie ao menos um arquivo para registrar acompanhamento.");
      return;
    }

    setIsSavingStageFollowUp(true);
    setMessage("");
    try {
      await createStageFollowUp(token, instrumentPageId, stage, {
        texto: stageFollowUpText,
        arquivos: stageFollowUpFiles
      });
      setStageFollowUpText("");
      setStageFollowUpFiles([]);
      setStageFollowUpModalStage(null);
      await loadAllStageFollowUps(instrumentPageId);
      setMessage("Acompanhamento da etapa registrado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar acompanhamento da etapa.");
    } finally {
      setIsSavingStageFollowUp(false);
    }
  };

  const onOpenStageFollowUpModal = (stage: WorkflowStage) => {
    setStageFollowUpModalStage(stage);
    setStageFollowUpText("");
    setStageFollowUpFiles([]);
    setIsDraggingStageFiles(false);
  };

  const onCloseStageFollowUpModal = () => {
    setStageFollowUpModalStage(null);
    setIsDraggingStageFiles(false);
  };

  const appendStageFollowUpFiles = (incoming: File[]) => {
    if (incoming.length === 0) {
      return;
    }

    setStageFollowUpFiles((prev) => {
      const known = new Set(prev.map((file) => `${file.name}|${file.size}|${file.lastModified}`));
      const next = [...prev];
      for (const file of incoming) {
        const key = `${file.name}|${file.size}|${file.lastModified}`;
        if (!known.has(key)) {
          next.push(file);
          known.add(key);
        }
      }
      return next;
    });
  };

  const onSelectStageFollowUpFiles = (files: FileList | null) => {
    appendStageFollowUpFiles(Array.from(files ?? []));
  };

  const onDropStageFollowUpFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingStageFiles(false);
    appendStageFollowUpFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const onRemoveSelectedStageFollowUpFile = (index: number) => {
    setStageFollowUpFiles((prev) => prev.filter((_, current) => current !== index));
  };

  const onDownloadStageFollowUpAttachment = async (stage: WorkflowStage, followUpId: number, fileId: number, name: string) => {
    if (!token || instrumentPageId === null) {
      return;
    }

    try {
      await downloadStageFollowUpFile(token, instrumentPageId, stage, followUpId, fileId, name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao baixar arquivo do acompanhamento.");
    }
  };

  const onToggleFollowUpText = (followUpId: number) => {
    setExpandedFollowUpIds((prev) =>
      prev.includes(followUpId) ? prev.filter((id) => id !== followUpId) : [...prev, followUpId]
    );
  };

  const onToggleChecklistAttachments = (itemId: number) => {
    setExpandedChecklistAttachmentItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const filterStageFollowUps = (items: StageFollowUp[]) => {
    return items.filter((item) => {
      if (stageFollowUpFilter === "SO_MEUS") {
        return user?.email ? item.user.email === user.email : false;
      }
      if (stageFollowUpFilter === "COM_ANEXO") {
        return item.arquivos.length > 0;
      }
      if (stageFollowUpFilter === "COM_TEXTO") {
        return (item.texto ?? "").trim().length > 0;
      }
      return true;
    });
  };

  const onStartExecution = async () => {
    if (!token || !profileInstrument) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateInstrument(token, profileInstrument.id, {
        status: "EM_EXECUCAO"
      });
      setSelectedInstrument(updated);
      await refreshData();
      await loadChecklist(profileInstrument.id);
      setMessage("Instrumento movido para EM_EXECUCAO.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao iniciar execucao.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSaveWorkProgress = async () => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const percentual = Number(obraPercentual);
    if (Number.isNaN(percentual) || percentual < 0 || percentual > 100) {
      setMessage("Percentual da obra deve estar entre 0 e 100.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await updateWorkProgress(token, instrumentPageId, percentual);
      await loadWorkProgress(instrumentPageId);
      setMessage("Percentual da obra atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar percentual da obra.");
    } finally {
      setIsBusy(false);
    }
  };

  const onAddMeasurementBulletin = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const valorMedicao = parseCurrencyInput(boletimValor);
    if (Number.isNaN(valorMedicao) || valorMedicao < 0) {
      setMessage("Valor do boletim invalido.");
      return;
    }

    const percentualInformado = boletimPercentual.trim() === "" ? undefined : Number(boletimPercentual);
    if (
      percentualInformado !== undefined &&
      (Number.isNaN(percentualInformado) || percentualInformado < 0 || percentualInformado > 100)
    ) {
      setMessage("Percentual informado no boletim deve estar entre 0 e 100.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await addWorkMeasurementBulletin(token, instrumentPageId, {
        data_boletim: boletimData,
        valor_medicao: valorMedicao,
        percentual_obra_informado: percentualInformado,
        observacao: asOptional(boletimObservacao)
      });
      setBoletimValor(formatCurrencyInput(0));
      setBoletimPercentual("");
      setBoletimObservacao("");
      await loadWorkProgress(instrumentPageId);
      await loadChecklist(instrumentPageId);
      setMessage("Boletim de medicao cadastrado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao cadastrar boletim de medicao.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeleteMeasurementBulletin = async (boletimId: number) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await deleteWorkMeasurementBulletin(token, instrumentPageId, boletimId);
      await loadWorkProgress(instrumentPageId);
      setMessage("Boletim removido.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover boletim.");
    } finally {
      setIsBusy(false);
    }
  };

  const onLogin = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");
    try {
      const auth = await login(email, senha);
      persistAuth(auth.access_token, auth.user);
      await refreshData(auth.access_token);
      setMessage(`Bem-vindo, ${auth.user.nome}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no login.");
    } finally {
      setIsBusy(false);
    }
  };

  const onChangeForm = <K extends keyof InstrumentForm>(field: K, value: InstrumentForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearForm = () => {
    setEditingId(null);
    setShowCreateInstrumentForm(false);
    setForm(emptyInstrumentForm());
  };

  const onEdit = (item: Instrument, openProfile = false) => {
    setEditingId(item.id);
    setShowCreateInstrumentForm(false);
    setForm(fromInstrumentToForm(item));
    setActiveView("instrumentos");
    setSelectedInstrument(item);
    if (openProfile) {
      navigateToInstrumentProfile(item.id);
    }
    setMessage(`Editando registro ${item.id}.`);
  };

  const onChangeView = (view: MenuView) => {
    setActiveView(view);
    if (view === "instrumentos") {
      setShowCreateInstrumentForm(false);
      setEditingId(null);
      navigateToInstrumentList();
      return;
    }

    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
    }
    setInstrumentPageId(null);
  };

  const onApplyRepasseReportFilters = async () => {
    if (reportFilters.convenete_id.trim() === "") {
      setMessage("Selecione um convenete para gerar o relatorio.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadRepasseReport();
      setMessage("Relatorio atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatorio de repasses.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearRepasseReportFilters = () => {
    setReportFilters((prev) => ({
      ...emptyReportFilters(),
      convenete_id: prev.convenete_id
    }));
    setReportData(null);
  };

  const onClearObraReportFilters = () => {
    setObraReportFilters((prev) => ({
      ...emptyObraReportFilters(),
      convenete_id: prev.convenete_id
    }));
    setObraReportData(null);
  };

  const onExportRepasseReportPdf = (mode: ReportPdfMode) => {
    if (!reportData) {
      setMessage("Gere o relatorio antes de exportar.");
      return;
    }
    exportRepasseReportPdf(reportData, mode);
  };

  const onExportObraReportPdf = (mode: ReportPdfMode) => {
    if (!obraReportData) {
      setMessage("Gere o relatorio de obras antes de exportar.");
      return;
    }
    exportObraReportPdf(obraReportData, mode);
  };

  const onStartCreateInstrument = () => {
    navigateToInstrumentList();
    setSelectedInstrument(null);
    setEditingId(null);
    setForm(emptyInstrumentForm());
    setShowCreateInstrumentForm(true);
    setMessage("Preencha os dados para adicionar um novo instrumento.");
  };

  const onSaveInstrument = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !canManageInstruments) {
      return;
    }

    const requiredFields = [form.proposta, form.instrumento, form.objeto, form.data_cadastro, form.concedente];
    if (requiredFields.some((value) => value.trim() === "")) {
      setMessage("Preencha os campos obrigatorios.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const currentEditingId = editingId;
      const wasEditing = currentEditingId !== null;
      const payload = toPayload(form);
      const saved = currentEditingId !== null
        ? await updateInstrument(token, currentEditingId, payload)
        : await createInstrument(token, payload);

      setInstruments((prev) => {
        if (wasEditing) {
          return prev.map((item) => (item.id === saved.id ? saved : item));
        }
        return [saved, ...prev];
      });
      setSelectedInstrument(saved);
      if (instrumentPageId === saved.id) {
        setSelectedInstrument(saved);
      }
      clearForm();
      setReportData(null);
      setObraReportData(null);
      await refreshData();
      setMessage(wasEditing ? "Instrumento atualizado." : "Instrumento criado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar instrumento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeactivate = async (item: Instrument) => {
    if (!token || !canDeactivateInstruments) {
      return;
    }

    if (!window.confirm(`Confirma inativar o instrumento ${item.instrumento}?`)) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await deactivateInstrument(token, item.id);
      if (selectedInstrument?.id === item.id) {
        setSelectedInstrument(null);
      }
      if (editingId === item.id) {
        clearForm();
      }
      await refreshData();
      setMessage("Instrumento inativado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao inativar instrumento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onTrack = async (id: number) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const item = await getInstrumentById(token, id);
      setSelectedInstrument(item);
      navigateToInstrumentProfile(id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar detalhes.");
    } finally {
      setIsBusy(false);
    }
  };

  const onChangeConveneteForm = <K extends keyof ConveneteForm>(field: K, value: ConveneteForm[K]) => {
    setConveneteForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearConveneteForm = () => {
    setEditingConveneteId(null);
    setConveneteForm(emptyConveneteForm());
  };

  const onSaveConvenete = async (event: FormEvent) => {
    event.preventDefault();

    if (!token || !canManageInstruments) {
      return;
    }

    const requiredFields = [
      conveneteForm.nome,
      conveneteForm.cnpj,
      conveneteForm.endereco,
      conveneteForm.bairro,
      conveneteForm.cep,
      conveneteForm.uf,
      conveneteForm.cidade,
      conveneteForm.tel,
      conveneteForm.email
    ];

    if (requiredFields.some((field) => field.trim() === "")) {
      setMessage("Preencha todos os campos de convenetes.");
      return;
    }

    const payload: ConveneteForm = {
      nome: conveneteForm.nome.trim(),
      cnpj: conveneteForm.cnpj.trim(),
      endereco: conveneteForm.endereco.trim(),
      bairro: conveneteForm.bairro.trim(),
      cep: conveneteForm.cep.trim(),
      uf: conveneteForm.uf.trim().toUpperCase(),
      cidade: conveneteForm.cidade.trim(),
      tel: conveneteForm.tel.trim(),
      email: conveneteForm.email.trim()
    };

    setIsBusy(true);
    setMessage("");
    try {
      if (editingConveneteId) {
        await updateConvenete(token, editingConveneteId, payload);
        setMessage("Convenete atualizado com sucesso.");
      } else {
        await createConvenete(token, payload);
        setMessage("Convenete cadastrado com sucesso.");
      }

      clearConveneteForm();
      await loadConvenetes();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar convenete.");
    } finally {
      setIsBusy(false);
    }
  };

  const onEditConvenete = (item: Convenete) => {
    setEditingConveneteId(item.id);
    setConveneteForm({
      nome: item.nome,
      cnpj: item.cnpj,
      endereco: item.endereco,
      bairro: item.bairro,
      cep: item.cep,
      uf: item.uf,
      cidade: item.cidade,
      tel: item.tel,
      email: item.email
    });
    setMessage(`Editando convenete #${item.id}.`);
  };

  const onDeleteConvenete = async (id: number) => {
    if (!token || !canDeactivateInstruments) {
      return;
    }

    if (!window.confirm("Confirma remover este convenete?")) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await deleteConvenete(token, id);
      if (editingConveneteId === id) {
        clearConveneteForm();
      }
      await loadConvenetes();
      setMessage("Convenete removido com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover convenete.");
    } finally {
      setIsBusy(false);
    }
  };

  const onChangeAdminUserForm = <K extends keyof AdminUserForm>(field: K, value: AdminUserForm[K]) => {
    setAdminUserForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearAdminUserForm = () => {
    setEditingManagedUserId(null);
    setAdminUserForm(emptyAdminUserForm());
  };

  const onEditManagedUser = (item: ManagedUser) => {
    setEditingManagedUserId(item.id);
    setAdminUserForm({
      nome: item.nome,
      email: item.email,
      senha: "",
      role: item.role
    });
    setMessage(`Editando usuario #${item.id}.`);
  };

  const onSaveManagedUser = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !isAdmin) {
      return;
    }

    if (adminUserForm.nome.trim() === "" || adminUserForm.email.trim() === "") {
      setMessage("Preencha nome e email do usuario.");
      return;
    }

    if (editingManagedUserId === null && adminUserForm.senha.trim().length < 6) {
      setMessage("Informe uma senha com pelo menos 6 caracteres.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      if (editingManagedUserId === null) {
        await createUserAdmin(token, {
          nome: adminUserForm.nome.trim(),
          email: adminUserForm.email.trim(),
          senha: adminUserForm.senha,
          role: adminUserForm.role
        });
        setMessage("Usuario criado com sucesso.");
      } else {
        await updateUserAdmin(token, editingManagedUserId, {
          nome: adminUserForm.nome.trim(),
          email: adminUserForm.email.trim(),
          role: adminUserForm.role,
          senha: adminUserForm.senha.trim() === "" ? undefined : adminUserForm.senha
        });
        setMessage("Usuario atualizado com sucesso.");
      }

      clearAdminUserForm();
      await loadManagedUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar usuario.");
    } finally {
      setIsBusy(false);
    }
  };

  const onApplyObraReportFilters = async () => {
    setIsBusy(true);
    setMessage("");
    try {
      await loadObraReport();
      setMessage("Relatorio de obras atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatorio de obras.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSeedDemoData = async () => {
    if (!token || !isAdmin) {
      return;
    }

    if (!window.confirm("Isso vai recriar os 10 instrumentos demo e seus repasses. Deseja continuar?")) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const result = await seedDemoDataAdmin(token);
      await refreshData();
      setMessage(`${result.message} Instrumentos: ${result.instrumentos}. Repasses: ${result.repasses}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar dados demo.");
    } finally {
      setIsBusy(false);
    }
  };

  const onApplyTicketFilters = async () => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadTickets();
      setSelectedTicket(null);
      setMessage("Tickets atualizados com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao listar tickets.");
    } finally {
      setIsBusy(false);
    }
  };

  const onChangeTicketBoardTab = (tab: TicketBoardTab) => {
    setTicketBoardTab(tab);
    if (selectedTicket) {
      const willBeVisible =
        tab === "abertos"
          ? selectedTicket.status === "ABERTO" || selectedTicket.status === "EM_ANDAMENTO"
          : tab === "resolvidos"
            ? selectedTicket.status === "RESOLVIDO"
            : selectedTicket.status === "CANCELADO";
      if (!willBeVisible) {
        setSelectedTicket(null);
      }
    }
  };

  const onClearTicketFilters = async () => {
    const next = emptyTicketFilters();
    setTicketFilters(next);
    setSelectedTicket(null);
    if (token) {
      try {
        await loadTickets(token, next);
      } catch {
        // ignored
      }
    }
  };

  const onFilterMyTickets = async () => {
    if (!user) {
      return;
    }

    const next = {
      ...ticketFilters,
      responsavel_user_id: String(user.id)
    };
    setTicketFilters(next);

    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadTickets(token, next);
      setSelectedTicket(null);
      setMessage("Filtro aplicado: meus tickets.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao filtrar meus tickets.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCreateTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !canManageInstruments) {
      return;
    }

    if (ticketForm.titulo.trim().length < 3) {
      setMessage("Informe um titulo com pelo menos 3 caracteres.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const created = await createTicket(token, {
        titulo: ticketForm.titulo.trim(),
        descricao: ticketForm.descricao.trim() === "" ? undefined : ticketForm.descricao.trim(),
        prioridade: ticketForm.prioridade,
        prazo_alvo: ticketForm.prazo_alvo.trim() === "" ? undefined : ticketForm.prazo_alvo,
        instrument_id: ticketForm.instrument_id.trim() === "" ? undefined : Number(ticketForm.instrument_id),
        instrumento_informado:
          ticketForm.instrumento_informado.trim() === "" ? undefined : ticketForm.instrumento_informado.trim(),
        responsavel_user_id:
          ticketForm.responsavel_user_id.trim() === "" ? undefined : Number(ticketForm.responsavel_user_id)
      });

      setTicketForm(emptyTicketForm());
      setTickets((prev) => [created, ...prev]);
      setSelectedTicket(created);
      setMessage(`Ticket ${created.codigo} criado com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSelectTicket = async (id: number) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const full = await getTicketById(token, id);
      setSelectedTicket(full);
      setTicketResolutionReason(full.motivo_resolucao ?? "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUpdateTicketStatus = async (id: number, status: TicketStatus) => {
    if (!token || !canManageInstruments) {
      return;
    }

    const currentStatus = selectedTicket?.id === id ? selectedTicket.status : tickets.find((item) => item.id === id)?.status;
    const isReopening =
      currentStatus === "RESOLVIDO" && (status === "ABERTO" || status === "EM_ANDAMENTO");
    if (isReopening && !isAdmin) {
      setMessage("Somente ADMIN pode reabrir ticket resolvido.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      if (status === "RESOLVIDO" && ticketResolutionReason.trim().length < 8) {
        setMessage("Informe um motivo de resolucao com pelo menos 8 caracteres.");
        setIsBusy(false);
        return;
      }

      const updated = await updateTicket(token, id, {
        status,
        motivo_resolucao: status === "RESOLVIDO" ? ticketResolutionReason.trim() : undefined
      });
      setTickets((prev) => prev.map((item) => (item.id === id ? updated : item)));
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
        if (status !== "RESOLVIDO") {
          setTicketResolutionReason("");
        }
      }
      if (status === "RESOLVIDO") {
        setTicketBoardTab("resolvidos");
      } else if (status === "CANCELADO") {
        setTicketBoardTab("cancelados");
      } else {
        setTicketBoardTab("abertos");
      }
      setMessage(`Ticket ${updated.codigo} atualizado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar status do ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUpdateTicketPriority = async (id: number, prioridade: TicketPriority) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateTicket(token, id, { prioridade });
      setTickets((prev) => prev.map((item) => (item.id === id ? updated : item)));
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
      }
      setMessage(`Prioridade atualizada no ticket ${updated.codigo}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar prioridade.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUpdateTicketDueDate = async (id: number, prazoAlvo: string) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateTicket(token, id, { prazo_alvo: prazoAlvo.trim() === "" ? null : prazoAlvo });
      setTickets((prev) => prev.map((item) => (item.id === id ? updated : item)));
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
      }
      setMessage(`Prazo alvo atualizado no ticket ${updated.codigo}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar prazo alvo.");
    } finally {
      setIsBusy(false);
    }
  };

  const onAssignTicket = async (id: number, responsavelUserId: string) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateTicket(token, id, {
        responsavel_user_id: responsavelUserId.trim() === "" ? null : Number(responsavelUserId)
      });
      setTickets((prev) => prev.map((item) => (item.id === id ? updated : item)));
      if (selectedTicket?.id === id) {
        setSelectedTicket(updated);
      }
      setMessage(`Responsavel atualizado no ticket ${updated.codigo}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atribuir responsavel.");
    } finally {
      setIsBusy(false);
    }
  };

  const onAddTicketComment = async () => {
    if (!token || !selectedTicket || !canManageInstruments) {
      return;
    }

    if (ticketCommentText.trim().length < 2) {
      setMessage("Comentario deve ter pelo menos 2 caracteres.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await addTicketComment(token, selectedTicket.id, ticketCommentText.trim());
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setTicketCommentText("");
      setMessage("Comentario registrado no ticket.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar comentario.");
    } finally {
      setIsBusy(false);
    }
  };

  const onAddRepasse = async () => {
    if (!token || instrumentPageId === null || !canManageInstruments || !profileInstrument) {
      return;
    }

    const valorRepasse = parseCurrencyInput(repasseValorInput);
    if (Number.isNaN(valorRepasse) || valorRepasse <= 0) {
      setMessage("Valor do repasse invalido.");
      return;
    }

    if (!repasseDataInput) {
      setMessage("Informe a data do repasse.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await addInstrumentRepasse(token, instrumentPageId, {
        data_repasse: repasseDataInput,
        valor_repasse: valorRepasse
      });

      const updatedWithRepasses = await withLoadedRepasses(token, updated);

      setInstruments((prev) => prev.map((item) => (item.id === updatedWithRepasses.id ? updatedWithRepasses : item)));
      setSelectedInstrument(updatedWithRepasses);
      setReportData(null);
      setObraReportData(null);
      setRepasseValorInput(formatCurrencyInput(0));
      setRepasseDataInput(todayDate());
      setMessage("Repasse cadastrado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao cadastrar repasse.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeleteRepasse = async (repasseId: number) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await deleteInstrumentRepasse(token, instrumentPageId, repasseId);
      const updatedWithRepasses = await withLoadedRepasses(token, updated);
      setInstruments((prev) => prev.map((item) => (item.id === updatedWithRepasses.id ? updatedWithRepasses : item)));
      setSelectedInstrument(updatedWithRepasses);
      setReportData(null);
      setObraReportData(null);
      setMessage("Repasse removido.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover repasse.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSaveEmpresaVencedora = async () => {
    if (!token || !profileInstrument || !canManageInstruments) {
      return;
    }

    const valor = empresaVencedoraInput.trim();
    if (valor === "") {
      setMessage("Informe nome e CNPJ da empresa vencedora.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateInstrument(token, profileInstrument.id, {
        orgao_executor: valor
      });
      const updatedWithRepasses = await withLoadedRepasses(token, updated);
      setInstruments((prev) => prev.map((item) => (item.id === updatedWithRepasses.id ? updatedWithRepasses : item)));
      setSelectedInstrument(updatedWithRepasses);
      setMessage("Empresa vencedora salva com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar empresa vencedora.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUploadMyAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !token) {
      return;
    }

    setIsUploadingAvatar(true);
    setMessage("");
    try {
      const updated = await uploadMyAvatar(token, file);
      persistAuth(token, updated);
      setMessage("Avatar atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onRemoveMyAvatar = async () => {
    if (!token || !user?.avatar_url) {
      return;
    }

    setIsUploadingAvatar(true);
    setMessage("");
    try {
      await removeMyAvatar(token);
      persistAuth(token, { ...user, avatar_url: null });
      setMessage("Avatar removido com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const renderInstrumentForm = () => (
    <div className="card editor-card">
      <h3>{editingId ? `Editar instrumento #${editingId}` : "Novo instrumento"}</h3>
      <form className="form-grid" onSubmit={onSaveInstrument}>
        <div className="filters-grid columns-4">
          <label>
            Proposta *
            <input value={form.proposta} onChange={(e) => onChangeForm("proposta", e.target.value)} required />
          </label>
          <label>
            Instrumento *
            <input value={form.instrumento} onChange={(e) => onChangeForm("instrumento", e.target.value)} required />
          </label>
          <label>
            Concedente *
            <input value={form.concedente} onChange={(e) => onChangeForm("concedente", e.target.value)} required />
          </label>
          <label>
            Banco
            <input
              value={form.banco}
              onChange={(e) => onChangeForm("banco", e.target.value)}
              placeholder="Ex.: Banco do Brasil"
            />
          </label>
          <label>
            Agencia
            <input
              value={form.agencia}
              onChange={(e) => onChangeForm("agencia", e.target.value)}
              placeholder="Ex.: 1234"
            />
          </label>
          <label>
            Conta
            <input
              value={form.conta}
              onChange={(e) => onChangeForm("conta", e.target.value)}
              placeholder="Ex.: 56789-0"
            />
          </label>
          <label>
            Convenete
            <select value={form.convenete_id} onChange={(e) => onChangeForm("convenete_id", e.target.value)}>
              <option value="">Nao associado</option>
              {convenetes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tipo de fluxo *
            <select
              value={form.fluxo_tipo}
              onChange={(e) => onChangeForm("fluxo_tipo", e.target.value as InstrumentFlowType)}
            >
              {FLOW_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {FLOW_TYPE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status *
            <select value={form.status} onChange={(e) => onChangeForm("status", e.target.value as InstrumentStatus)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Valor repasse *
            <input
              type="text"
              inputMode="numeric"
              className="currency-input"
              value={form.valor_repasse}
              onChange={(e) => onChangeForm("valor_repasse", normalizeCurrencyInput(e.target.value))}
              required
            />
          </label>
          <label>
            Valor contrapartida *
            <input
              type="text"
              inputMode="numeric"
              className="currency-input"
              value={form.valor_contrapartida}
              onChange={(e) => onChangeForm("valor_contrapartida", normalizeCurrencyInput(e.target.value))}
              required
            />
          </label>
          <label>
            Data cadastro *
            <input
              type="date"
              value={form.data_cadastro}
              onChange={(e) => onChangeForm("data_cadastro", e.target.value)}
              required
            />
          </label>
          <label>
            Data assinatura
            <input
              type="date"
              value={form.data_assinatura}
              onChange={(e) => onChangeForm("data_assinatura", e.target.value)}
            />
          </label>

          <label>
            Vigencia inicio *
            <input
              type="date"
              value={form.vigencia_inicio}
              onChange={(e) => onChangeForm("vigencia_inicio", e.target.value)}
              required
            />
          </label>
          <label>
            Vigencia fim *
            <input
              type="date"
              value={form.vigencia_fim}
              onChange={(e) => onChangeForm("vigencia_fim", e.target.value)}
              required
            />
          </label>
          <label>
            Prestacao contas
            <input
              type="date"
              value={form.data_prestacao_contas}
              onChange={(e) => onChangeForm("data_prestacao_contas", e.target.value)}
            />
          </label>
          <label>
            Data DOU
            <input type="date" value={form.data_dou} onChange={(e) => onChangeForm("data_dou", e.target.value)} />
          </label>

          <label>
            Responsavel
            <input value={form.responsavel} onChange={(e) => onChangeForm("responsavel", e.target.value)} />
          </label>
          <label>
            Orgao executor
            <input value={form.orgao_executor} onChange={(e) => onChangeForm("orgao_executor", e.target.value)} />
          </label>
        </div>

        <label>
          Objeto *
          <textarea value={form.objeto} onChange={(e) => onChangeForm("objeto", e.target.value)} rows={3} required />
        </label>

        <label>
          Observacoes
          <textarea value={form.observacoes} onChange={(e) => onChangeForm("observacoes", e.target.value)} rows={3} />
        </label>

        <div className="action-row">
          <button type="submit" disabled={isBusy}>
            {editingId ? "Salvar alteracoes" : "Criar instrumento"}
          </button>
          <button type="button" className="secondary" onClick={clearForm}>
            Limpar formulario
          </button>
        </div>
      </form>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="page">
        <header className="hero">
          <div>
            <img className="hero-logo" src={logoSrc} alt="Gestconv360" />
          </div>
          <div className={`health health-${healthStatus}`}>
            API: {healthStatus === "checking" ? "verificando" : healthStatus === "ok" ? "online" : "offline"}
          </div>
        </header>

        <section className="login-layout">
          <article className="card system-info-card">
            <h3>Funcionalidades do modulo</h3>
            <p className="subtitle">Visao completa para ciclo de instrumentos e propostas.</p>

            <div className="feature-grid">
              <div className="feature-item">
                <p className="eyebrow">Instrumentos</p>
                <p>CRUD completo com filtros por status, concedente, vigencia e ativo.</p>
              </div>
              <div className="feature-item">
                <p className="eyebrow">Checklist</p>
                <p>Controle de documentos obrigatorios com upload, download e pendencias.</p>
              </div>
              <div className="feature-item">
                <p className="eyebrow">Auditoria</p>
                <p>Historico de alteracoes com usuario, data e campos alterados.</p>
              </div>
              <div className="feature-item">
                <p className="eyebrow">Painel</p>
                <p>KPIs, alertas de prazo e exportacao CSV/Excel para analise rapida.</p>
              </div>
            </div>

            <div className="quick-stats">
              <span>Perfis: ADMIN, GESTOR, CONSULTA</span>
              <span>Alertas: vigencia e prestacao de contas</span>
              <span>Seguranca: autenticacao JWT</span>
            </div>
          </article>

          <section className="card auth-card">
            <form onSubmit={onLogin} className="form-grid">
              <p className="subtitle">Acesso restrito. Novos usuarios sao cadastrados somente por administrador.</p>

              <label>
                E-mail
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="admin@gestconv360.local"
                  required
                />
              </label>

              <label>
                Senha
                <input
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  type="password"
                  minLength={6}
                  required
                />
              </label>

              <button type="submit" disabled={isBusy}>
                {isBusy ? "Processando..." : "Entrar"}
              </button>
            </form>
          </section>
        </section>

        {message && <p className="message">{message}</p>}
      </div>
    );
  }

  return (
    <div className="page">
      <div className="app-shell">
        <aside className="card sidebar">
          <img className="sidebar-logo" src={logoSrc} alt="Gestconv360" />
          <p className="eyebrow">Menu</p>
          <button
            type="button"
            className={activeView === "dashboard" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("dashboard")}
          >
            Dashboard
          </button>
          <button
            type="button"
            className={activeView === "instrumentos" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("instrumentos")}
          >
            Instrumentos/Propostas
          </button>
          <button
            type="button"
            className={activeView === "convenetes" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("convenetes")}
          >
            Convenetes
          </button>
          {isAdmin && (
            <button
              type="button"
              className={activeView === "usuarios" ? "menu-item active" : "menu-item"}
              onClick={() => onChangeView("usuarios")}
            >
              Usuarios
            </button>
          )}
          <button
            type="button"
            className={activeView === "auditoria" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("auditoria")}
          >
            Auditoria/Historico
          </button>
          <button
            type="button"
            className={activeView === "tickets" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("tickets")}
          >
            Tickets
          </button>
          <button
            type="button"
            className={activeView === "relatorios" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("relatorios")}
          >
            Relatorios
          </button>

          <div className="sidebar-footer">
            <div className="user-panel">
              {user?.avatar_url ? (
                <img className="user-avatar" src={toAbsoluteUrl(user.avatar_url)} alt={user.nome} />
              ) : (
                <div className="user-avatar user-avatar-fallback">{getInitials(user?.nome, user?.email ?? "")}</div>
              )}
              <div className="user-panel-info">
                <p>{user?.nome}</p>
                <p>{user?.role}</p>
              </div>
            </div>
            <div className="user-panel-actions">
              <label className="ghost upload-trigger">
                {isUploadingAvatar ? "Enviando..." : "Alterar avatar"}
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={onUploadMyAvatar}
                  disabled={isUploadingAvatar}
                />
              </label>
              {user?.avatar_url && (
                <button type="button" className="ghost" onClick={onRemoveMyAvatar} disabled={isUploadingAvatar}>
                  Remover avatar
                </button>
              )}
            </div>
            <button type="button" className="ghost" onClick={clearAuth}>
              Sair
            </button>
          </div>
        </aside>

        <main className="content">
          <header className="card topbar">
            <div>
              <h2>
                {activeView === "dashboard"
                  ? "Dashboard"
                  : activeView === "instrumentos"
                    ? isInstrumentProfileView
                      ? `Acompanhamento do instrumento #${instrumentPageId}`
                      : "Instrumentos e Propostas"
                    : activeView === "convenetes"
                      ? "Cadastro de Convenetes"
                    : activeView === "usuarios"
                      ? "Gestao de Usuarios"
                    : activeView === "auditoria"
                      ? "Auditoria e Historico"
                      : activeView === "tickets"
                        ? "Central de Tickets"
                       : "Relatorios Analiticos"}
              </h2>
              <p className="subtitle">
                {isInstrumentProfileView
                  ? "Pagina unica para acompanhar e editar o instrumento selecionado."
                  : "Visao operacional com filtros, CRUD e exportacao."}
              </p>
            </div>
            <div className={`health health-${healthStatus}`}>
              API: {healthStatus === "checking" ? "verificando" : healthStatus === "ok" ? "online" : "offline"}
            </div>
          </header>

          <section className="card technical-health-card">
            <div>
              <h3>Saude tecnica</h3>
              <p className="subtitle">
                Backend v{technicalHealth.backendVersion} | Rota relatorios:{" "}
                {technicalHealth.reportRouteStatus === "ok"
                  ? "ok"
                  : technicalHealth.reportRouteStatus === "missing"
                    ? "nao encontrada"
                    : technicalHealth.reportRouteStatus === "checking"
                      ? "verificando"
                      : "erro"}
              </p>
              <p className="subtitle">
                Ultima verificacao:{" "}
                {technicalHealth.lastCheckedAt
                  ? new Date(technicalHealth.lastCheckedAt).toLocaleString("pt-BR")
                  : "ainda nao verificada"}
              </p>
            </div>
            <button type="button" className="secondary" onClick={refreshTechnicalHealth} disabled={isBusy}>
              Verificar agora
            </button>
          </section>

          {activeView === "dashboard" ? (
            <section className="dashboard">
              <div className="card">
                <h3>
                  Painel inicial {user?.role ? `(${user.role})` : ""}
                </h3>
                <p className="subtitle">Resumo executivo para tomada de decisao rapida ao entrar no sistema.</p>
              </div>

              <div className="dashboard-kpi-grid">
                <div className="card kpi-card">
                  <p className="eyebrow">Instrumentos</p>
                  <h3>{dashboard.totalRegistros}</h3>
                </div>
                <div className="card kpi-card">
                  <p className="eyebrow">Ativos</p>
                  <h3>{dashboard.ativos}</h3>
                </div>
                <div className="card kpi-card">
                  <p className="eyebrow">Valor pactuado</p>
                  <h3>{formatCurrency(dashboard.valorTotal)}</h3>
                </div>
                <div className="card kpi-card">
                  <p className="eyebrow">Valor ja repassado</p>
                  <h3>{formatCurrency(dashboardInsights.totalRepassado)}</h3>
                </div>
                <div className="card kpi-card">
                  <p className="eyebrow">% medio repassado</p>
                  <h3>{dashboardInsights.percentualMedioRepassado.toFixed(2)}%</h3>
                </div>
                <div className="card kpi-card">
                  <p className="eyebrow">Alertas de prazo</p>
                  <h3>{dashboard.alertas}</h3>
                </div>
                {user?.role === "ADMIN" ? (
                  <>
                    <div className="card kpi-card">
                      <p className="eyebrow">Usuarios cadastrados</p>
                      <h3>{dashboardInsights.usuarios}</h3>
                    </div>
                    <div className="card kpi-card">
                      <p className="eyebrow">Logs auditoria</p>
                      <h3>{dashboardInsights.logs}</h3>
                    </div>
                  </>
                ) : user?.role === "GESTOR" ? (
                  <>
                    <div className="card kpi-card">
                      <p className="eyebrow">Em execucao</p>
                      <h3>{dashboardInsights.emExecucao}</h3>
                    </div>
                    <div className="card kpi-card">
                      <p className="eyebrow">Prestacao pendente</p>
                      <h3>{dashboardInsights.prestacaoPendente}</h3>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="card kpi-card">
                      <p className="eyebrow">Vencidos</p>
                      <h3>{dashboardInsights.vencidos}</h3>
                    </div>
                    <div className="card kpi-card">
                      <p className="eyebrow">Em execucao</p>
                      <h3>{dashboardInsights.emExecucao}</h3>
                    </div>
                  </>
                )}
              </div>

              <div className="dashboard-panels-grid">
                <div className="card">
                  <h3>Prazos criticos (top 5)</h3>
                  <div className="table-wrap table-wrap-compact">
                    <table>
                      <thead>
                        <tr>
                          <th>Instrumento</th>
                          <th>Vigencia</th>
                          <th>Prestacao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardInsights.alertasCriticos.length === 0 ? (
                          <tr>
                            <td colSpan={3}>Sem alertas criticos no momento.</td>
                          </tr>
                        ) : (
                          dashboardInsights.alertasCriticos.map((item) => (
                            <tr key={item.instrumento_id}>
                              <td>{item.instrumento}</td>
                              <td>{item.dias_para_vigencia_fim} dias</td>
                              <td>{item.dias_para_prestacao_contas ?? "-"} dias</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <h3>Obras com menor execucao financeira</h3>
                  <div className="table-wrap table-wrap-compact">
                    <table>
                      <thead>
                        <tr>
                          <th>Instrumento</th>
                          <th>Concedente</th>
                          <th>% repassado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardInsights.obrasComBaixoRepasse.length === 0 ? (
                          <tr>
                            <td colSpan={3}>Sem obras para analise.</td>
                          </tr>
                        ) : (
                          dashboardInsights.obrasComBaixoRepasse.map((item) => (
                            <tr key={item.id}>
                              <td>{item.instrumento}</td>
                              <td>{item.concedente}</td>
                              <td>{item.percentual_repassado.toFixed(2)}%</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <h3>Distribuicao por fluxo</h3>
                  <div className="table-wrap table-wrap-compact">
                    <table>
                      <thead>
                        <tr>
                          <th>Fluxo</th>
                          <th>Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardInsights.porFluxo.map((item) => (
                          <tr key={item.fluxo}>
                            <td>{item.fluxo}</td>
                            <td>{item.quantidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="card">
                  <h3>Top concedentes</h3>
                  <div className="table-wrap table-wrap-compact">
                    <table>
                      <thead>
                        <tr>
                          <th>Concedente</th>
                          <th>Instrumentos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboardInsights.topConcedentes.length === 0 ? (
                          <tr>
                            <td colSpan={2}>Sem dados de concedente.</td>
                          </tr>
                        ) : (
                          dashboardInsights.topConcedentes.map((item) => (
                            <tr key={item.concedente}>
                              <td>{item.concedente}</td>
                              <td>{item.quantidade}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>Acoes rapidas</h3>
                <div className="action-row">
                  <button type="button" onClick={() => refreshData()} disabled={isBusy}>
                    Atualizar dashboard
                  </button>
                  <button type="button" className="secondary" onClick={() => onChangeView("instrumentos")}>Instrumentos</button>
                  <button type="button" className="secondary" onClick={() => onChangeView("relatorios")}>Relatorios</button>
                  {isAdmin && (
                    <button type="button" className="secondary" onClick={() => onChangeView("usuarios")}>Usuarios</button>
                  )}
                </div>
              </div>
            </section>
          ) : activeView === "instrumentos" ? (
            <section className="dashboard">
              {canManageInstruments && !isInstrumentProfileView && (
                <div className="card sticky-add-row">
                  <button type="button" className="add-new-cta" onClick={onStartCreateInstrument}>
                    Adicionar novo
                  </button>
                </div>
              )}

              <div className="card filters-card">
                <h3>Filtros da listagem</h3>
                <div className="filters-grid columns-4">
                  <label>
                    Status
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, status: e.target.value as InstrumentStatus | "" }))
                      }
                    >
                      <option value="">Todos</option>
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Concedente
                    <select
                      value={filters.concedente}
                      onChange={(e) => setFilters((prev) => ({ ...prev, concedente: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {concedenteOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Convenente
                    <select
                      value={filters.convenete_id}
                      onChange={(e) => setFilters((prev) => ({ ...prev, convenete_id: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {convenetes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Vigencia de
                    <input
                      type="date"
                      value={filters.vigencia_de}
                      onChange={(e) => setFilters((prev) => ({ ...prev, vigencia_de: e.target.value }))}
                    />
                  </label>

                  <label>
                    Vigencia ate
                    <input
                      type="date"
                      value={filters.vigencia_ate}
                      onChange={(e) => setFilters((prev) => ({ ...prev, vigencia_ate: e.target.value }))}
                    />
                  </label>

                  <label>
                    Ativo
                    <select
                      value={filters.ativo}
                      onChange={(e) => setFilters((prev) => ({ ...prev, ativo: e.target.value as "true" | "false" }))}
                    >
                      <option value="true">Sim</option>
                      <option value="false">Nao</option>
                    </select>
                  </label>
                </div>

                <div className="action-row">
                  <button type="button" onClick={() => refreshData()} disabled={isBusy}>
                    Aplicar filtros
                  </button>
                  <button type="button" className="secondary" onClick={() => exportCsv(sortedInstruments)}>
                    Exportar CSV da lista
                  </button>
                  <button type="button" className="secondary" onClick={() => exportExcel(sortedInstruments)}>
                    Exportar Excel da lista
                  </button>
                </div>
              </div>

              {isInstrumentProfileView ? (
                isEditingProfileInstrument ? (
                  renderInstrumentForm()
                ) : (
                  <>
                  <div className="card profile-card">
                    <div className="profile-header-row">
                      <h3>{profileInstrument ? `Instrumento ${profileInstrument.instrumento}` : "Carregando instrumento"}</h3>
                      <div className="action-row compact">
                        <button type="button" className="ghost" onClick={navigateToInstrumentList}>
                          Voltar para lista
                        </button>
                        {profileInstrument && (
                          <button
                            type="button"
                            className={`secondary panel-toggle${showRepassePanel ? " active" : ""}`}
                            onClick={() => {
                              setShowRepassePanel((prev) => !prev);
                              setShowWorkProgressPanel(false);
                            }}
                          >
                            Lista de Repasses
                          </button>
                        )}
                        {profileInstrument && (
                          <button
                            type="button"
                            className={`secondary panel-toggle${showWorkProgressPanel ? " active" : ""}`}
                            onClick={() => {
                              setShowWorkProgressPanel((prev) => !prev);
                              setShowRepassePanel(false);
                            }}
                          >
                            Acompanhamento de obras
                          </button>
                        )}
                        {canManageInstruments && profileInstrument && (
                          <button type="button" onClick={() => onEdit(profileInstrument)}>
                            Editar
                          </button>
                        )}
                        {canDeactivateInstruments && profileInstrument?.ativo && (
                          <button type="button" className="danger" onClick={() => onDeactivate(profileInstrument)}>
                            Inativar
                          </button>
                        )}
                      </div>
                    </div>

                    {!profileInstrument ? (
                      <p>Carregando dados do instrumento...</p>
                    ) : (
                      <>
                        <div className="details-grid profile-grid">
                        <p>
                          <strong>ID:</strong> {profileInstrument.id}
                        </p>
                        <p>
                          <strong>Proposta:</strong> {profileInstrument.proposta}
                        </p>
                        <p>
                          <strong>Status:</strong> {profileInstrument.status}
                        </p>
                        <p>
                          <strong>Fluxo:</strong> {FLOW_TYPE_LABELS[profileInstrument.fluxo_tipo]}
                        </p>
                        <p>
                          <strong>Concedente:</strong> {profileInstrument.concedente}
                        </p>
                        <p>
                          <strong>Dados bancarios:</strong>{" "}
                          {formatBankInfo(profileInstrument) || "-"}
                        </p>
                        <p>
                          <strong>Convenete:</strong>{" "}
                          {profileInstrument.convenete_id
                            ? (conveneteNameById.get(profileInstrument.convenete_id) ?? `#${profileInstrument.convenete_id}`)
                            : "-"}
                        </p>
                        <p>
                          <strong>Vigencia:</strong> {profileInstrument.vigencia_inicio ?? "-"} a{" "}
                          {profileInstrument.vigencia_fim ?? "-"}
                        </p>
                        <p>
                          <strong>Valor total:</strong> {formatCurrency(profileInstrument.valor_total)}
                        </p>
                        <p>
                          <strong>Ativo:</strong> {profileInstrument.ativo ? "Sim" : "Nao"}
                        </p>
                        <p className="profile-object">
                          <strong>Objeto:</strong> {profileInstrument.objeto}
                        </p>
                        <p>
                          <strong>Observacoes:</strong> {profileInstrument.observacoes ?? "-"}
                        </p>
                        </div>

                        {showRepassePanel && (
                          <div className="repasse-card">
                            <h3>Lista de Repasses</h3>
                            <div className="repasse-grid">
                              <p>
                                <strong>Valor total do repasse:</strong> {formatCurrency(profileInstrument.valor_repasse)}
                              </p>
                              <p>
                                <strong>Valor contrapartida:</strong> {formatCurrency(profileInstrument.valor_contrapartida)}
                              </p>
                              <p>
                                <strong>Valor ja repassado:</strong> {formatCurrency(profileInstrument.valor_ja_repassado)}
                              </p>
                              <p>
                                <strong>Total de repasses:</strong> {profileInstrumentRepasses.length}
                              </p>
                              <p>
                                <strong>% repassado:</strong> {repassePercentualAtual.toFixed(2)}%
                              </p>
                            </div>

                            <div className="repasse-progress" role="presentation">
                              <span style={{ width: `${repassePercentualAtual}%` }} />
                            </div>

                            {canManageInstruments && (
                              <div className="repasse-form">
                                <input
                                  type="date"
                                  value={repasseDataInput}
                                  onChange={(e) => setRepasseDataInput(e.target.value)}
                                />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={repasseValorInput}
                                  onChange={(e) => setRepasseValorInput(normalizeCurrencyInput(e.target.value))}
                                  placeholder="Valor do repasse"
                                />
                                <button type="button" onClick={onAddRepasse} disabled={isBusy}>
                                  Adicionar repasse
                                </button>
                              </div>
                            )}

                            <div className="repasse-list">
                              {profileInstrumentRepasses.length === 0 ? (
                                <p>Nenhum repasse cadastrado.</p>
                              ) : (
                                profileInstrumentRepasses.map((repasse) => (
                                  <div key={repasse.id} className="repasse-item">
                                    <span>{repasse.data_repasse}</span>
                                    <strong>{formatCurrency(repasse.valor_repasse)}</strong>
                                    {canManageInstruments && (
                                      <button
                                        type="button"
                                        className="ghost"
                                        onClick={() => onDeleteRepasse(repasse.id)}
                                        disabled={isBusy}
                                      >
                                        Remover
                                      </button>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {showWorkProgressPanel && (
                          <div className="work-progress-card">
                            <h3>Acompanhamento de obra</h3>
                            <p className="subtitle">
                              Empresa vencedora (nome/CNPJ): {profileInstrument.orgao_executor?.trim() || "Nao informada"}
                            </p>
                            <p className="subtitle">
                              Valor ja repassado: {formatCurrency(profileInstrument.valor_ja_repassado)} | Valor total de repasse: {" "}
                              {formatCurrency(profileInstrument.valor_repasse)}
                            </p>
                            <p className="subtitle">
                              Percentual atual: {workProgress ? `${workProgress.percentual_obra.toFixed(2)}%` : "0.00%"} | Total boletins:{" "}
                              {formatCurrency(workProgress?.valor_total_boletins ?? 0)}
                            </p>

                            {canManageInstruments && (
                              <div className="action-row compact">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={obraPercentual}
                                  onChange={(e) => setObraPercentual(e.target.value)}
                                  placeholder="Percentual da obra"
                                />
                                <button type="button" onClick={onSaveWorkProgress} disabled={isBusy}>
                                  Salvar percentual
                                </button>
                              </div>
                            )}

                            {canManageInstruments && (
                              <form className="checklist-add-form" onSubmit={onAddMeasurementBulletin}>
                                <input type="date" value={boletimData} onChange={(e) => setBoletimData(e.target.value)} required />
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={boletimValor}
                                  onChange={(e) => setBoletimValor(normalizeCurrencyInput(e.target.value))}
                                  placeholder="Valor do boletim"
                                  required
                                />
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={boletimPercentual}
                                  onChange={(e) => setBoletimPercentual(e.target.value)}
                                  placeholder="% obra (opcional)"
                                />
                                <input
                                  value={boletimObservacao}
                                  onChange={(e) => setBoletimObservacao(e.target.value)}
                                  placeholder="Observacao"
                                />
                                <button type="submit" disabled={isBusy}>
                                  Adicionar boletim
                                </button>
                              </form>
                            )}

                            {workProgress && workProgress.boletins.length > 0 ? (
                              <div className="table-wrap">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Data</th>
                                      <th>Valor</th>
                                      <th>% obra</th>
                                      <th>Observacao</th>
                                      {canManageInstruments && <th>Acoes</th>}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {workProgress.boletins.map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.data_boletim}</td>
                                        <td>{formatCurrency(item.valor_medicao)}</td>
                                        <td>
                                          {item.percentual_obra_informado === null ? "-" : `${item.percentual_obra_informado.toFixed(2)}%`}
                                        </td>
                                        <td>{item.observacao ?? "-"}</td>
                                        {canManageInstruments && (
                                          <td>
                                            <button
                                              type="button"
                                              className="danger"
                                              onClick={() => onDeleteMeasurementBulletin(item.id)}
                                            >
                                              Excluir
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="subtitle">Nenhum boletim de medicao cadastrado.</p>
                            )}
                          </div>
                        )}

                        {!showRepassePanel && !showWorkProgressPanel && (
                          <div className="checklist-card">
                          <div className="checklist-head">
                            <h3>Fluxo de liberacao do recurso federal - {FLOW_TYPE_LABELS[currentFlowType]}</h3>
                            <div className="checklist-head-meta">
                              {canManageInstruments && (
                                <label className="checklist-validity-control">
                                  Validade do link externo
                                  <select
                                    value={String(externalLinkValidityDays)}
                                    onChange={(e) => setExternalLinkValidityDays(Number(e.target.value))}
                                  >
                                    {EXTERNAL_LINK_VALIDITY_OPTIONS.map((days) => (
                                      <option key={days} value={String(days)}>
                                        {days} dia{days > 1 ? "s" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              )}
                              {checklistSummary && (
                                <p className="subtitle">
                                  {checklistSummary.concluidos}/{checklistSummary.total} concluidos | obrigatorios: {" "}
                                  {checklistSummary.obrigatorios_concluidos}/{checklistSummary.obrigatorios}
                                </p>
                              )}
                            </div>
                          </div>

                          {checklistSummary?.etapa_atual && (
                            <p className="subtitle">Etapa atual: {stageLabels[checklistSummary.etapa_atual]}</p>
                          )}

                          {canManageInstruments && (
                            <form className="checklist-add-form" onSubmit={onAddChecklistItem}>
                              <select value={checklistStage} onChange={(e) => setChecklistStage(e.target.value as WorkflowStage)}>
                                {WORKFLOW_STAGES.map((stage) => (
                                  <option key={stage} value={stage}>
                                    {stageLabels[stage]}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={checklistDocName}
                                onChange={(e) => setChecklistDocName(e.target.value)}
                                placeholder="Nome do documento"
                                required
                              />
                              <input
                                value={checklistNote}
                                onChange={(e) => setChecklistNote(e.target.value)}
                                placeholder="Observacao (opcional)"
                              />
                              <label className="checklist-toggle">
                                <input
                                  type="checkbox"
                                  checked={checklistRequired}
                                  onChange={(e) => setChecklistRequired(e.target.checked)}
                                />
                                Obrigatorio
                              </label>
                              <button type="submit" disabled={isBusy}>
                                Adicionar item
                              </button>
                            </form>
                          )}

                          {checklistItems.length === 0 ? (
                            <p>Sem checklist cadastrado para este instrumento.</p>
                          ) : (
                            <div className="workflow-stage-list">
                              {WORKFLOW_STAGES.map((stage) => {
                                const stageItems = checklistItems.filter((item) => item.etapa === stage);
                                const stageResume = checklistSummary?.etapas.find((item) => item.etapa === stage);
                                const isExpanded = activeWorkflowStage === stage;
                                const isStageDone = Boolean(stageResume?.concluida);
                                const allFollowUps = stageFollowUps[stage] ?? [];
                                const visibleFollowUps = filterStageFollowUps(allFollowUps);
                                const totalAttachments = allFollowUps.reduce((acc, item) => acc + item.arquivos.length, 0);
                                const latestFollowUp = allFollowUps[0] ?? null;

                                return (
                                  <section
                                    key={stage}
                                    className={`workflow-stage-section${isExpanded ? " open" : ""}${
                                      isStageDone ? " done" : ""
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      className="workflow-accordion-trigger"
                                      onClick={() => onToggleWorkflowStage(stage)}
                                    >
                                      <div className="workflow-stage-head">
                                        <h4>{stageLabels[stage]}</h4>
                                        <span className={isExpanded ? "accordion-indicator open" : "accordion-indicator"}>
                                          {isExpanded ? "-" : "+"}
                                        </span>
                                      </div>
                                      {stageResume ? (
                                        <span className={stageResume.concluida ? "stage-badge done" : "stage-badge"}>
                                          {stageResume.concluida ? "Concluida" : "Pendente"}
                                        </span>
                                      ) : (
                                        <span className="stage-badge">Sem itens</span>
                                      )}
                                    </button>

                                    {isExpanded && (
                                      <div className="workflow-accordion-content">
                                        {stageResume && (
                                          <p className="subtitle">
                                            Obrigatorios: {stageResume.obrigatorios_concluidos}/{stageResume.obrigatorios}
                                          </p>
                                        )}

                                        {stage === "PROCESSO_EXECUCAO_LICITACAO" && (
                                          <div className="work-progress-card">
                                            <h5>Empresa vencedora da licitacao (nome e CNPJ)</h5>
                                            {canManageInstruments ? (
                                              <div className="action-row compact">
                                                <input
                                                  value={empresaVencedoraInput}
                                                  onChange={(e) => setEmpresaVencedoraInput(e.target.value)}
                                                  placeholder="Ex.: Construtora Exemplo LTDA - 12.345.678/0001-90"
                                                />
                                                <button type="button" onClick={onSaveEmpresaVencedora} disabled={isBusy}>
                                                  Salvar empresa
                                                </button>
                                              </div>
                                            ) : (
                                              <p className="subtitle">
                                                {profileInstrument?.orgao_executor?.trim() || "Empresa vencedora nao informada."}
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        <div className="stage-followup-box">
                                          <div className="stage-followup-head">
                                            <h5>Acompanhamento da etapa</h5>
                                            <div className="stage-followup-stats">
                                              <span>{allFollowUps.length} registro(s)</span>
                                              <span>{totalAttachments} anexo(s)</span>
                                              <span>
                                                {latestFollowUp
                                                  ? `Ultimo: ${new Date(latestFollowUp.created_at).toLocaleDateString("pt-BR")}`
                                                  : "Sem registros"}
                                              </span>
                                            </div>
                                          </div>
                                          {canManageInstruments && (
                                            <div className="stage-followup-actions">
                                              <button type="button" onClick={() => onOpenStageFollowUpModal(stage)}>
                                                Novo acompanhamento
                                              </button>
                                            </div>
                                          )}

                                          {stageFollowUpModalStage === stage && (
                                            <div className="stage-followup-modal-overlay" onClick={onCloseStageFollowUpModal}>
                                              <div className="stage-followup-modal" onClick={(event) => event.stopPropagation()}>
                                                <div className="stage-followup-modal-head">
                                                  <h5>Novo acompanhamento</h5>
                                                  <button
                                                    type="button"
                                                    className="ghost compact-link"
                                                    onClick={onCloseStageFollowUpModal}
                                                  >
                                                    Fechar
                                                  </button>
                                                </div>
                                                <p className="subtitle">{stageLabels[stage]}</p>
                                                <div className="stage-followup-form">
                                                  <textarea
                                                    value={stageFollowUpText}
                                                    onChange={(e) => setStageFollowUpText(e.target.value)}
                                                    placeholder="Registre observacoes livres sobre o andamento desta etapa"
                                                    rows={4}
                                                  />
                                                  <div
                                                    className={
                                                      isDraggingStageFiles
                                                        ? "stage-followup-dropzone dragging"
                                                        : "stage-followup-dropzone"
                                                    }
                                                    onDragOver={(event) => {
                                                      event.preventDefault();
                                                      setIsDraggingStageFiles(true);
                                                    }}
                                                    onDragLeave={() => setIsDraggingStageFiles(false)}
                                                    onDrop={onDropStageFollowUpFiles}
                                                  >
                                                    <p>
                                                      Arraste arquivos aqui ou clique para selecionar
                                                    </p>
                                                    <label className="ghost upload-trigger">
                                                      Selecionar arquivos
                                                      <input
                                                        type="file"
                                                        multiple
                                                        onChange={(e) => onSelectStageFollowUpFiles(e.target.files)}
                                                        disabled={isSavingStageFollowUp}
                                                      />
                                                    </label>
                                                  </div>
                                                  <div className="stage-followup-selected-files">
                                                    {stageFollowUpFiles.length > 0
                                                      ? `${stageFollowUpFiles.length} arquivo(s) selecionado(s)`
                                                      : "Nenhum arquivo selecionado"}
                                                  </div>
                                                  {stageFollowUpFiles.length > 0 && (
                                                    <div className="stage-followup-selected-list">
                                                      {stageFollowUpFiles.map((file, index) => (
                                                        <div key={`${file.name}-${file.lastModified}-${index}`} className="stage-followup-selected-item">
                                                          <span>{file.name}</span>
                                                          <span className="subtitle">{formatFileSize(file.size)}</span>
                                                          <button
                                                            type="button"
                                                            className="ghost compact-link"
                                                            onClick={() => onRemoveSelectedStageFollowUpFile(index)}
                                                            disabled={isSavingStageFollowUp}
                                                          >
                                                            Remover
                                                          </button>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                  <div className="action-row compact">
                                                    <button
                                                      type="button"
                                                      className="ghost"
                                                      onClick={onCloseStageFollowUpModal}
                                                      disabled={isSavingStageFollowUp}
                                                    >
                                                      Cancelar
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => onSaveStageFollowUp(stage)}
                                                      disabled={isSavingStageFollowUp}
                                                    >
                                                      Salvar acompanhamento
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          )}

                                          <div className="stage-followup-toolbar">
                                            <label>
                                              Filtro
                                              <select
                                                value={stageFollowUpFilter}
                                                onChange={(e) => setStageFollowUpFilter(e.target.value as StageFollowUpFilter)}
                                              >
                                                {(Object.keys(STAGE_FOLLOW_UP_FILTER_LABELS) as StageFollowUpFilter[]).map(
                                                  (option) => (
                                                    <option key={option} value={option}>
                                                      {STAGE_FOLLOW_UP_FILTER_LABELS[option]}
                                                    </option>
                                                  )
                                                )}
                                              </select>
                                            </label>
                                            <p className="subtitle">Mostrando {visibleFollowUps.length} registro(s)</p>
                                          </div>

                                          <div className="stage-followup-history">
                                            {visibleFollowUps.length === 0 ? (
                                              <p className="subtitle">Sem registros de acompanhamento nesta etapa.</p>
                                            ) : (
                                              visibleFollowUps.map((followUp) => (
                                                <article key={followUp.id} className="stage-followup-item">
                                                  <div className="stage-followup-item-head">
                                                    <div className="stage-followup-user">
                                                      {followUp.user.avatar_url ? (
                                                        <img
                                                          className="followup-avatar"
                                                          src={toAbsoluteUrl(followUp.user.avatar_url)}
                                                          alt={followUp.user.nome ?? followUp.user.email}
                                                        />
                                                      ) : (
                                                        <div className="followup-avatar followup-avatar-fallback">
                                                          {getInitials(followUp.user.nome, followUp.user.email)}
                                                        </div>
                                                      )}
                                                      <div>
                                                        <p className="stage-followup-user-name">
                                                          {followUp.user.nome
                                                            ? `${followUp.user.nome} (${followUp.user.email})`
                                                            : followUp.user.email}
                                                        </p>
                                                        <p className="subtitle">
                                                          {new Date(followUp.created_at).toLocaleString("pt-BR")}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <span className="stage-badge">
                                                      {followUp.texto && followUp.arquivos.length > 0
                                                        ? "Texto + anexo"
                                                        : followUp.arquivos.length > 0
                                                          ? "Anexo"
                                                          : "Texto"}
                                                    </span>
                                                  </div>
                                                  {followUp.texto && (
                                                    <div>
                                                      <p
                                                        className={
                                                          expandedFollowUpIds.includes(followUp.id)
                                                            ? "stage-followup-text"
                                                            : "stage-followup-text compact"
                                                        }
                                                      >
                                                        {expandedFollowUpIds.includes(followUp.id)
                                                          ? followUp.texto
                                                          : summarizeText(followUp.texto, 180)}
                                                      </p>
                                                      {followUp.texto.length > 180 && (
                                                        <button
                                                          type="button"
                                                          className="ghost compact-link"
                                                          onClick={() => onToggleFollowUpText(followUp.id)}
                                                        >
                                                          {expandedFollowUpIds.includes(followUp.id)
                                                            ? "Mostrar menos"
                                                            : "Ver mais"}
                                                        </button>
                                                      )}
                                                    </div>
                                                  )}
                                                  {followUp.arquivos.length > 0 && (
                                                    <div className="stage-followup-files">
                                                      {followUp.arquivos.map((file) => (
                                                        <button
                                                          key={file.id}
                                                          type="button"
                                                          className="secondary"
                                                          onClick={() =>
                                                            onDownloadStageFollowUpAttachment(
                                                              stage,
                                                              followUp.id,
                                                              file.id,
                                                              file.nome_original
                                                            )
                                                          }
                                                        >
                                                          Baixar {file.nome_original}
                                                        </button>
                                                      ))}
                                                    </div>
                                                  )}
                                                </article>
                                              ))
                                            )}
                                          </div>
                                        </div>

                                        {stageItems.length === 0 ? (
                                          <p className="subtitle">Nenhum item cadastrado nesta etapa.</p>
                                        ) : (
                                          <div className="checklist-list">
                                            {stageItems.map((item) => {
                                              const statusVisual = getChecklistStatusVisual(item.status);
                                              const isPropostaItem = item.etapa === "PROPOSTA";
                                              const statusOptions = isPropostaItem
                                                ? PROPOSTA_STATUS_OPTIONS
                                                : CHECKLIST_STATUS_OPTIONS;
                                              const statusLabelMap = isPropostaItem
                                                ? PROPOSTA_STATUS_LABELS
                                                : CHECKLIST_STATUS_LABELS;
                                              const hasExternalAttachments = (item.anexos_externos?.length ?? 0) > 0;
                                              const isAttachmentExpanded = expandedChecklistAttachmentItemIds.includes(item.id);
                                              return (
                                                <article key={item.id} className="checklist-item">
                                                  <div>
                                                    <p className="checklist-title">
                                                      <span className={`check-status ${statusVisual.tone}`}>
                                                        {statusVisual.icon}
                                                      </span>
                                                      {item.nome_documento}
                                                      {item.obrigatorio && <span className="check-required">Obrigatorio</span>}
                                                    </p>
                                                    <p className="subtitle">Status: {item.status_label ?? statusLabelMap[item.status]}</p>
                                                    {item.observacao && <p className="subtitle">{item.observacao}</p>}
                                                    {item.solicitacao_externa && (
                                                      <div className="external-link-box">
                                                        <p className="subtitle">
                                                          Link externo ativo ate {new Date(item.solicitacao_externa.expira_em).toLocaleString("pt-BR")}
                                                        </p>
                                                        <div className="action-row compact external-link-row">
                                                          <input value={toAbsoluteUrl(item.solicitacao_externa.link_publico)} readOnly />
                                                          <button
                                                            type="button"
                                                            className="ghost"
                                                            onClick={() => onCopyExternalLink(item.solicitacao_externa?.link_publico ?? "")}
                                                          >
                                                            Copiar
                                                          </button>
                                                        </div>
                                                      </div>
                                                    )}
                                                    {hasExternalAttachments && (
                                                      <div className="external-files-panel">
                                                        <button
                                                          type="button"
                                                          className="attachment-chip"
                                                          onClick={() => onToggleChecklistAttachments(item.id)}
                                                        >
                                                          {isAttachmentExpanded
                                                            ? "Ocultar anexos"
                                                            : `Ver anexos (${item.anexos_externos.length})`}
                                                        </button>
                                                        {isAttachmentExpanded && (
                                                          <div className="external-files-list">
                                                            {(item.anexos_externos ?? []).map((file) => (
                                                              <div key={file.id} className="external-file-row">
                                                                <div>
                                                                  <p className="external-file-name">{file.nome_original}</p>
                                                                  <p className="subtitle">
                                                                    {file.nome_remetente} | {formatFileSize(file.tamanho ?? 0)} |{" "}
                                                                    {new Date(file.created_at).toLocaleString("pt-BR")}
                                                                  </p>
                                                                  <p className="subtitle">
                                                                    <span
                                                                      className={`external-link-state ${
                                                                        getExternalLinkState(file).tone
                                                                      }`}
                                                                    >
                                                                      {getExternalLinkState(file).label}
                                                                    </span>
                                                                  </p>
                                                                </div>
                                                                <button
                                                                  type="button"
                                                                  className="secondary"
                                                                  onClick={() =>
                                                                    onDownloadChecklistExternalAttachment(
                                                                      item.id,
                                                                      file.id,
                                                                      file.nome_original
                                                                    )
                                                                  }
                                                                >
                                                                  Baixar
                                                                </button>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                  <div className="action-row compact checklist-actions">
                                                    {canManageInstruments && (
                                                      <button
                                                        type="button"
                                                        className="ghost"
                                                        onClick={() => onGenerateChecklistExternalLink(item.id)}
                                                        disabled={busyExternalLinkItemId === item.id}
                                                      >
                                                        {item.solicitacao_externa ? "Gerar novo link externo" : "Gerar link externo"}
                                                      </button>
                                                    )}
                                                    {canManageInstruments && item.solicitacao_externa && (
                                                      <button
                                                        type="button"
                                                        className="danger"
                                                        onClick={() => onDeactivateChecklistExternalLink(item.id)}
                                                        disabled={busyExternalLinkItemId === item.id}
                                                      >
                                                        Desativar link externo
                                                      </button>
                                                    )}
                                                    {canManageInstruments && (
                                                      <select
                                                        value={item.status}
                                                        onChange={(e) =>
                                                          onUpdateChecklistItemStatus(
                                                            item.id,
                                                            e.target.value as ChecklistItemStatus
                                                          )
                                                        }
                                                        disabled={busyChecklistItemId === item.id || busyExternalLinkItemId === item.id}
                                                      >
                                                        {statusOptions.map((option) => (
                                                          <option key={option} value={option}>
                                                            {getChecklistStatusOptionLabel(option, statusLabelMap[option])}
                                                          </option>
                                                        ))}
                                                      </select>
                                                    )}
                                                    {canManageInstruments && (
                                                      <button
                                                        type="button"
                                                        className="danger"
                                                        onClick={() => onDeleteChecklistItem(item.id)}
                                                        disabled={busyChecklistItemId === item.id || busyExternalLinkItemId === item.id}
                                                      >
                                                        Excluir item
                                                      </button>
                                                    )}
                                                  </div>
                                                </article>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </section>
                                );
                              })}
                            </div>
                          )}

                          {profileInstrument.status !== "EM_EXECUCAO" && canManageInstruments && (
                            <div className="checklist-start-row">
                              <button
                                type="button"
                                onClick={onStartExecution}
                                disabled={!checklistSummary?.pode_iniciar_execucao || isBusy}
                              >
                                Iniciar execucao
                              </button>
                              {!checklistSummary?.pode_iniciar_execucao && (
                                <p className="subtitle">
                                  Para iniciar execucao, faltam: {checklistSummary?.pendentes_obrigatorios.join(", ") || "adicione itens obrigatorios"}
                                </p>
                              )}
                            </div>
                          )}

                        </div>
                        )}
                      </>
                    )}
                  </div>

                  </>
                )
              ) : (
                <>
                  {canManageInstruments && showCreateInstrumentForm && renderInstrumentForm()}

                  <div className="card table-card">
                    <h3>Lista de instrumentos</h3>
                    {sortedInstruments.length === 0 ? (
                      <p>Nenhum registro encontrado.</p>
                    ) : (
                      <div className="instrument-list">
                        {sortedInstruments.map((item) => (
                          <article key={item.id} className="instrument-card">
                            <div className="instrument-card-head">
                              <p className="eyebrow">Instrumento</p>
                              <h3>{item.instrumento}</h3>
                              <p className="subtitle">Proposta {item.proposta}</p>
                            </div>
                            <p className="instrument-summary">{summarizeText(item.objeto)}</p>
                            <div className="instrument-meta">
                              <span>{item.status}</span>
                              <span>{item.vigencia_fim ? `Vigencia ate ${item.vigencia_fim}` : "Sem vigencia final"}</span>
                              <span>{formatCurrency(item.valor_total)}</span>
                            </div>
                            <div className="action-row compact">
                              <button type="button" className="secondary" onClick={() => onTrack(item.id)}>
                                Acompanhar
                              </button>
                              {canManageInstruments && (
                                <button type="button" onClick={() => onEdit(item, true)}>
                                  Editar
                                </button>
                              )}
                              {canDeactivateInstruments && item.ativo && (
                                <button type="button" className="danger" onClick={() => onDeactivate(item)}>
                                  Inativar
                                </button>
                              )}
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          ) : activeView === "convenetes" ? (
            <section className="dashboard">
              {canManageInstruments && (
                <div className="card editor-card">
                  <h3>{editingConveneteId ? `Editar convenete #${editingConveneteId}` : "Novo convenete"}</h3>
                  <form className="form-grid" onSubmit={onSaveConvenete}>
                    <div className="filters-grid columns-4">
                      <label>
                        NOME *
                        <input
                          value={conveneteForm.nome}
                          onChange={(e) => onChangeConveneteForm("nome", e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        CNPJ *
                        <input
                          value={conveneteForm.cnpj}
                          onChange={(e) => onChangeConveneteForm("cnpj", e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        ENDERECO *
                        <input
                          value={conveneteForm.endereco}
                          onChange={(e) => onChangeConveneteForm("endereco", e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        BAIRRO *
                        <input
                          value={conveneteForm.bairro}
                          onChange={(e) => onChangeConveneteForm("bairro", e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        CEP *
                        <input
                          value={conveneteForm.cep}
                          onChange={(e) => onChangeConveneteForm("cep", e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        UF *
                        <input
                          value={conveneteForm.uf}
                          maxLength={2}
                          onChange={(e) => onChangeConveneteForm("uf", e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        CIDADE *
                        <input
                          value={conveneteForm.cidade}
                          onChange={(e) => onChangeConveneteForm("cidade", e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        TEL *
                        <input
                          value={conveneteForm.tel}
                          onChange={(e) => onChangeConveneteForm("tel", e.target.value)}
                          required
                        />
                      </label>
                      <label>
                        EMAIL *
                        <input
                          type="email"
                          value={conveneteForm.email}
                          onChange={(e) => onChangeConveneteForm("email", e.target.value)}
                          required
                        />
                      </label>
                    </div>

                    <div className="action-row">
                      <button type="submit" disabled={isBusy}>
                        {editingConveneteId ? "Salvar alteracoes" : "Cadastrar convenete"}
                      </button>
                      <button type="button" className="secondary" onClick={clearConveneteForm}>
                        Limpar formulario
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="card table-card">
                <h3>Lista de convenetes</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>NOME</th>
                        <th>CNPJ</th>
                        <th>CIDADE/UF</th>
                        <th>TEL</th>
                        <th>EMAIL</th>
                        <th>ACOES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {convenetes.length === 0 ? (
                        <tr>
                          <td colSpan={7}>Nenhum convenete cadastrado.</td>
                        </tr>
                      ) : (
                        convenetes.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>{item.nome}</td>
                            <td>{item.cnpj}</td>
                            <td>{item.cidade}/{item.uf}</td>
                            <td>{item.tel}</td>
                            <td>{item.email}</td>
                            <td>
                              <div className="action-row compact">
                                {canManageInstruments && (
                                  <button type="button" onClick={() => onEditConvenete(item)}>
                                    Editar
                                  </button>
                                )}
                                {canDeactivateInstruments && (
                                  <button type="button" className="danger" onClick={() => onDeleteConvenete(item.id)}>
                                    Remover
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : activeView === "usuarios" ? (
            <section className="dashboard">
              {isAdmin ? (
                <>
                  <div className="card editor-card">
                    <h3>{editingManagedUserId ? `Editar usuario #${editingManagedUserId}` : "Novo usuario"}</h3>
                    <form className="form-grid" onSubmit={onSaveManagedUser}>
                      <div className="filters-grid columns-4">
                        <label>
                          Nome *
                          <input
                            value={adminUserForm.nome}
                            onChange={(e) => onChangeAdminUserForm("nome", e.target.value)}
                            required
                          />
                        </label>
                        <label>
                          E-mail *
                          <input
                            type="email"
                            value={adminUserForm.email}
                            onChange={(e) => onChangeAdminUserForm("email", e.target.value)}
                            required
                          />
                        </label>
                        <label>
                          Perfil *
                          <select
                            value={adminUserForm.role}
                            onChange={(e) => onChangeAdminUserForm("role", e.target.value as Role)}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="GESTOR">GESTOR</option>
                            <option value="CONSULTA">CONSULTA</option>
                          </select>
                        </label>
                        <label>
                          Senha {editingManagedUserId ? "(opcional)" : "*"}
                          <input
                            type="password"
                            minLength={6}
                            value={adminUserForm.senha}
                            onChange={(e) => onChangeAdminUserForm("senha", e.target.value)}
                            required={editingManagedUserId === null}
                          />
                        </label>
                      </div>

                      <div className="action-row">
                        <button type="submit" disabled={isBusy}>
                          {editingManagedUserId ? "Salvar alteracoes" : "Criar usuario"}
                        </button>
                        <button type="button" className="secondary" onClick={clearAdminUserForm}>
                          Limpar formulario
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="card table-card">
                    <h3>Usuarios cadastrados</h3>
                    <div className="action-row compact">
                      <button type="button" className="secondary" onClick={onSeedDemoData} disabled={isBusy}>
                        Carregar 10 instrumentos demo
                      </button>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Avatar</th>
                            <th>Nome</th>
                            <th>E-mail</th>
                            <th>Perfil</th>
                            <th>Criado em</th>
                            <th>Acoes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {managedUsers.length === 0 ? (
                            <tr>
                              <td colSpan={7}>Nenhum usuario cadastrado.</td>
                            </tr>
                          ) : (
                            managedUsers.map((item) => (
                              <tr key={item.id}>
                                <td>{item.id}</td>
                                <td>
                                  {item.avatar_url ? (
                                    <img className="table-avatar" src={toAbsoluteUrl(item.avatar_url)} alt={item.nome} />
                                  ) : (
                                    <div className="table-avatar table-avatar-fallback">
                                      {getInitials(item.nome, item.email)}
                                    </div>
                                  )}
                                </td>
                                <td>{item.nome}</td>
                                <td>{item.email}</td>
                                <td>{item.role}</td>
                                <td>{new Date(item.created_at).toLocaleString("pt-BR")}</td>
                                <td>
                                  <div className="action-row compact">
                                    <button type="button" onClick={() => onEditManagedUser(item)}>
                                      Editar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="card table-card">
                  <p>Acesso restrito a administradores.</p>
                </div>
              )}
            </section>
          ) : activeView === "tickets" ? (
            <section className="dashboard">
              <div className="card filters-card">
                <h3>Filtros de tickets</h3>
                <div className="filters-grid columns-5">
                  <label>
                    Status
                    <select
                      value={ticketFilters.status}
                      onChange={(e) =>
                        setTicketFilters((prev) => ({ ...prev, status: e.target.value as TicketStatus | "" }))
                      }
                    >
                      <option value="">Todos</option>
                      {TICKET_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {TICKET_STATUS_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Prioridade
                    <select
                      value={ticketFilters.prioridade}
                      onChange={(e) =>
                        setTicketFilters((prev) => ({ ...prev, prioridade: e.target.value as TicketPriority | "" }))
                      }
                    >
                      <option value="">Todas</option>
                      {TICKET_PRIORITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {TICKET_PRIORITY_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Origem
                    <select
                      value={ticketFilters.origem}
                      onChange={(e) =>
                        setTicketFilters((prev) => ({ ...prev, origem: e.target.value as TicketSource | "" }))
                      }
                    >
                      <option value="">Todas</option>
                      {TICKET_SOURCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {TICKET_SOURCE_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Instrumento
                    <select
                      value={ticketFilters.instrument_id}
                      onChange={(e) => setTicketFilters((prev) => ({ ...prev, instrument_id: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {sortedInstruments.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.instrumento} | proposta {item.proposta}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Responsavel
                    <select
                      value={ticketFilters.responsavel_user_id}
                      onChange={(e) =>
                        setTicketFilters((prev) => ({ ...prev, responsavel_user_id: e.target.value }))
                      }
                      disabled={ticketAssignableUsers.length === 0}
                    >
                      <option value="">Todos</option>
                      {ticketAssignableUsers.map((userItem) => (
                        <option key={userItem.id} value={String(userItem.id)}>
                          {userItem.nome} ({userItem.role})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Busca livre
                    <input
                      value={ticketFilters.q}
                      onChange={(e) => setTicketFilters((prev) => ({ ...prev, q: e.target.value }))}
                      placeholder="Codigo, titulo, descricao"
                    />
                  </label>
                  <label className="ticket-overdue-toggle">
                    <span>Somente atrasados</span>
                    <input
                      type="checkbox"
                      checked={ticketFilters.somente_atrasados}
                      onChange={(e) =>
                        setTicketFilters((prev) => ({ ...prev, somente_atrasados: e.target.checked }))
                      }
                    />
                  </label>
                </div>
                <div className="action-row">
                  <button type="button" onClick={onApplyTicketFilters} disabled={isBusy}>
                    Aplicar filtros
                  </button>
                  <button type="button" className="secondary" onClick={onClearTicketFilters} disabled={isBusy}>
                    Limpar filtros
                  </button>
                  <button type="button" className="secondary" onClick={onFilterMyTickets} disabled={isBusy || !user}>
                    Meus tickets
                  </button>
                </div>
              </div>

              {canManageInstruments && (
                <div className="card editor-card">
                  <h3>Abrir ticket manual</h3>
                  <form className="form-grid" onSubmit={onCreateTicket}>
                    <div className="filters-grid columns-4">
                      <label>
                        Titulo *
                        <input
                          value={ticketForm.titulo}
                          onChange={(e) => setTicketForm((prev) => ({ ...prev, titulo: e.target.value }))}
                          placeholder="Ex.: Pendencia documental no instrumento"
                          required
                        />
                      </label>
                      <label>
                        Prioridade
                        <select
                          value={ticketForm.prioridade}
                          onChange={(e) =>
                            setTicketForm((prev) => ({ ...prev, prioridade: e.target.value as TicketPriority }))
                          }
                        >
                          {TICKET_PRIORITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {TICKET_PRIORITY_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Prazo alvo (SLA)
                        <input
                          type="date"
                          value={ticketForm.prazo_alvo}
                          onChange={(e) => setTicketForm((prev) => ({ ...prev, prazo_alvo: e.target.value }))}
                        />
                      </label>
                      <label>
                        Instrumento (opcional)
                        <select
                          value={ticketForm.instrument_id}
                          onChange={(e) => setTicketForm((prev) => ({ ...prev, instrument_id: e.target.value }))}
                        >
                          <option value="">Nao associado</option>
                          {sortedInstruments.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.instrumento} | proposta {item.proposta}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Instrumento informado
                        <input
                          value={ticketForm.instrumento_informado}
                          onChange={(e) =>
                            setTicketForm((prev) => ({ ...prev, instrumento_informado: e.target.value }))
                          }
                          placeholder="Texto livre para identificacao"
                        />
                      </label>
                      <label>
                        Responsavel inicial
                        <select
                          value={ticketForm.responsavel_user_id}
                          onChange={(e) =>
                            setTicketForm((prev) => ({ ...prev, responsavel_user_id: e.target.value }))
                          }
                        >
                          <option value="">Nao atribuido</option>
                          {ticketAssignableUsers.map((userItem) => (
                            <option key={userItem.id} value={String(userItem.id)}>
                              {userItem.nome} ({userItem.role})
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      Descricao
                      <textarea
                        rows={3}
                        value={ticketForm.descricao}
                        onChange={(e) => setTicketForm((prev) => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Contexto do atendimento"
                      />
                    </label>
                    <div className="action-row">
                      <button type="submit" disabled={isBusy}>
                        Criar ticket
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="tickets-layout">
                <div className="card table-card">
                  <div className="ticket-board-tabs">
                    <button
                      type="button"
                      className={ticketBoardTab === "abertos" ? "ticket-board-tab active" : "ticket-board-tab"}
                      onClick={() => onChangeTicketBoardTab("abertos")}
                    >
                      Em aberto ({openTickets.length})
                    </button>
                    <button
                      type="button"
                      className={ticketBoardTab === "resolvidos" ? "ticket-board-tab active" : "ticket-board-tab"}
                      onClick={() => onChangeTicketBoardTab("resolvidos")}
                    >
                      Resolvidos ({resolvedTickets.length})
                    </button>
                    <button
                      type="button"
                      className={ticketBoardTab === "cancelados" ? "ticket-board-tab active" : "ticket-board-tab"}
                      onClick={() => onChangeTicketBoardTab("cancelados")}
                    >
                      Cancelados ({canceledTickets.length})
                    </button>
                  </div>

                  <h3>
                    {ticketBoardTab === "abertos"
                      ? `Fila de tickets em aberto (${openTickets.length})`
                      : ticketBoardTab === "resolvidos"
                        ? `Fila de tickets resolvidos (${resolvedTickets.length})`
                        : `Fila de tickets cancelados (${canceledTickets.length})`}
                  </h3>
                  {visibleTickets.length === 0 ? (
                    <p>Nenhum ticket encontrado.</p>
                  ) : (
                    <div className="ticket-list">
                      {visibleTickets.map((item) => {
                        const isSelected = selectedTicket?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={isSelected ? "ticket-item active" : "ticket-item"}
                            onClick={() => onSelectTicket(item.id)}
                          >
                            <div className="ticket-item-head">
                              <strong>{item.codigo}</strong>
                              <span>{TICKET_STATUS_LABELS[item.status]}</span>
                            </div>
                            <p>{item.titulo}</p>
                            <div className="ticket-item-meta">
                              <span className={`ticket-priority-chip ${item.prioridade.toLowerCase()}`}>
                                {TICKET_PRIORITY_LABELS[item.prioridade]}
                              </span>
                              <span>{item.origem === "MANUAL" ? "Manual" : "Email"}</span>
                              <span>{item.instrumento?.instrumento ?? item.instrumento_informado ?? "Sem instrumento"}</span>
                              <span>{item.responsavel?.nome ?? "Sem responsavel"}</span>
                            </div>
                            <p className="subtitle">SLA: {formatTicketSla(item)}</p>
                            <p className="subtitle">
                              Atualizado em {new Date(item.updated_at).toLocaleString("pt-BR")}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="card table-card">
                  {!selectedTicket ? (
                    <p>Selecione um ticket para ver detalhes e comentarios.</p>
                  ) : (
                    <div className="ticket-detail">
                      <div>
                        <p className="eyebrow">{selectedTicket.codigo}</p>
                        <h3>{selectedTicket.titulo}</h3>
                        <p className="subtitle">
                          {TICKET_STATUS_LABELS[selectedTicket.status]} | {TICKET_SOURCE_LABELS[selectedTicket.origem]} | Criado em {" "}
                          {new Date(selectedTicket.created_at).toLocaleString("pt-BR")}
                        </p>
                        <p className="subtitle">
                          Prioridade: {TICKET_PRIORITY_LABELS[selectedTicket.prioridade]} | SLA: {formatTicketSla(selectedTicket)}
                        </p>
                        <p className="subtitle">
                          Criado por {selectedTicket.criado_por.nome} ({selectedTicket.criado_por.role})
                        </p>
                      </div>

                      <div className="details-grid">
                        <p>
                          <strong>Instrumento:</strong>{" "}
                          {selectedTicket.instrumento
                            ? `${selectedTicket.instrumento.instrumento} (proposta ${selectedTicket.instrumento.proposta})`
                            : selectedTicket.instrumento_informado ?? "Nao informado"}
                        </p>
                        <p>
                          <strong>Responsavel:</strong> {selectedTicket.responsavel?.nome ?? "Nao atribuido"}
                        </p>
                        <p>
                          <strong>Descricao:</strong> {selectedTicket.descricao ?? "Sem descricao"}
                        </p>
                        <p>
                          <strong>Prazo alvo:</strong>{" "}
                          {selectedTicket.prazo_alvo ? formatDateOnlyPtBr(selectedTicket.prazo_alvo) : "Nao definido"}
                        </p>
                        {selectedTicket.resolvido_em && (
                          <p>
                            <strong>Resolvido em:</strong> {new Date(selectedTicket.resolvido_em).toLocaleString("pt-BR")}
                          </p>
                        )}
                        {selectedTicket.motivo_resolucao && (
                          <p>
                            <strong>Motivo da resolucao:</strong> {selectedTicket.motivo_resolucao}
                          </p>
                        )}
                      </div>

                      {canManageInstruments && (
                        <>
                          <div className="action-row compact">
                            <label>
                              Prioridade
                              <select
                                value={selectedTicket.prioridade}
                                onChange={(e) => onUpdateTicketPriority(selectedTicket.id, e.target.value as TicketPriority)}
                                disabled={isBusy}
                              >
                                {TICKET_PRIORITY_OPTIONS.map((priority) => (
                                  <option key={priority} value={priority}>
                                    {TICKET_PRIORITY_LABELS[priority]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Prazo alvo
                              <input
                                type="date"
                                value={selectedTicket.prazo_alvo ? selectedTicket.prazo_alvo.slice(0, 10) : ""}
                                onChange={(e) => onUpdateTicketDueDate(selectedTicket.id, e.target.value)}
                                disabled={isBusy}
                              />
                            </label>
                          </div>

                          <div className="ticket-resolution-box">
                            <label>
                              Motivo de resolucao (obrigatorio para concluir)
                              <textarea
                                rows={2}
                                value={ticketResolutionReason}
                                onChange={(e) => setTicketResolutionReason(e.target.value)}
                                placeholder="Descreva o que foi feito para resolver"
                              />
                            </label>
                          </div>

                          {selectedTicket.status === "RESOLVIDO" && (
                            <div className="action-row compact">
                              <button
                                type="button"
                                onClick={() => onUpdateTicketStatus(selectedTicket.id, "EM_ANDAMENTO")}
                                disabled={isBusy || !isAdmin}
                              >
                                Reabrir ticket
                              </button>
                            </div>
                          )}

                          <div className="action-row compact">
                            {TICKET_STATUS_OPTIONS.map((status) => {
                              const isReopenStatus = status === "ABERTO" || status === "EM_ANDAMENTO";
                              const blockedByRole =
                                selectedTicket.status === "RESOLVIDO" && isReopenStatus && !isAdmin;
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  className={selectedTicket.status === status ? "secondary" : "ghost"}
                                  onClick={() => onUpdateTicketStatus(selectedTicket.id, status)}
                                  disabled={isBusy || selectedTicket.status === status || blockedByRole}
                                  title={blockedByRole ? "Somente ADMIN pode reabrir ticket resolvido." : undefined}
                                >
                                  {TICKET_STATUS_LABELS[status]}
                                </button>
                              );
                            })}
                          </div>

                          <div className="action-row compact">
                            <label>
                              Alterar responsavel
                              <select
                                value={selectedTicket.responsavel?.id ? String(selectedTicket.responsavel.id) : ""}
                                onChange={(e) => onAssignTicket(selectedTicket.id, e.target.value)}
                                disabled={isBusy}
                              >
                                <option value="">Nao atribuido</option>
                                {ticketAssignableUsers.map((userItem) => (
                                  <option key={userItem.id} value={String(userItem.id)}>
                                    {userItem.nome} ({userItem.role})
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        </>
                      )}

                      <div className="ticket-comments">
                        <h3>Comentarios ({selectedTicket.comentarios.length})</h3>
                        {selectedTicket.comentarios.length === 0 ? (
                          <p className="subtitle">Nenhum comentario registrado.</p>
                        ) : (
                          <div className="ticket-comment-list">
                            {selectedTicket.comentarios.map((comment) => (
                              <article key={comment.id} className="ticket-comment-item">
                                <p className="ticket-comment-head">
                                  <strong>{comment.user.nome}</strong> ({comment.user.role})
                                </p>
                                <p className="subtitle">{new Date(comment.created_at).toLocaleString("pt-BR")}</p>
                                <p>{comment.mensagem}</p>
                              </article>
                            ))}
                          </div>
                        )}

                        {canManageInstruments && (
                          <div className="ticket-comment-form">
                            <textarea
                              rows={3}
                              value={ticketCommentText}
                              onChange={(e) => setTicketCommentText(e.target.value)}
                              placeholder="Adicionar comentario"
                            />
                            <div className="action-row compact">
                              <button type="button" onClick={onAddTicketComment} disabled={isBusy}>
                                Comentar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          ) : activeView === "auditoria" ? (
            <section className="dashboard">
              <div className="card filters-card">
                <h3>Filtro de auditoria</h3>
                <div className="filters-grid columns-4">
                  <label>
                    Instrumento ID
                    <input
                      type="number"
                      min="1"
                      placeholder="Ex.: 12"
                      value={auditInstrumentId}
                      onChange={(e) => setAuditInstrumentId(e.target.value)}
                    />
                  </label>

                  <label>
                    Acao
                    <select value={auditAction} onChange={(e) => setAuditAction(e.target.value as AuditAction | "") }>
                      <option value="">Todas</option>
                      {AUDIT_ACTION_OPTIONS.map((action) => (
                        <option key={action} value={action}>
                          {action}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="action-row">
                  <button type="button" onClick={() => refreshData()} disabled={isBusy}>
                    Atualizar historico
                  </button>
                </div>
              </div>

              <div className="card table-card">
                <h3>Historico de alteracoes</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Instrumento ID</th>
                        <th>Acao</th>
                        <th>Usuario</th>
                        <th>Campos alterados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5}>Nenhum log de auditoria encontrado.</td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id}>
                            <td>{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                            <td>{log.instrumento_id}</td>
                            <td>{log.acao}</td>
                            <td>{log.user_email}</td>
                            <td>
                              {Array.isArray(log.campos_alterados) && log.campos_alterados.length > 0
                                ? log.campos_alterados.join(", ")
                                : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ) : (
            <section className="dashboard">
              <div className="tab-row">
                <button
                  type="button"
                  className={relatorioTab === "repasses" ? "tab active" : "tab"}
                  onClick={() => setRelatorioTab("repasses")}
                >
                  Repasses
                </button>
                <button
                  type="button"
                  className={relatorioTab === "obras" ? "tab active" : "tab"}
                  onClick={() => setRelatorioTab("obras")}
                >
                  Acompanhamento de Obras
                </button>
              </div>

              {relatorioTab === "repasses" ? (
              <>
              <div className="card filters-card">
                <h3>Relatorio de repasses por convenete</h3>
                <div className="filters-grid columns-4">
                  <label>
                    Convenete *
                    <select
                      value={reportFilters.convenete_id}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          convenete_id: e.target.value,
                          instrumento_id: ""
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      {convenetes.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nome} ({item.cnpj})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Instrumento (opcional)
                    <select
                      value={reportFilters.instrumento_id}
                      onChange={(e) => setReportFilters((prev) => ({ ...prev, instrumento_id: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {reportInstrumentOptions.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.instrumento} | proposta {item.proposta}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Data de
                    <input
                      type="date"
                      value={reportFilters.data_de}
                      onChange={(e) => setReportFilters((prev) => ({ ...prev, data_de: e.target.value }))}
                    />
                  </label>
                  <label>
                    Data ate
                    <input
                      type="date"
                      value={reportFilters.data_ate}
                      onChange={(e) => setReportFilters((prev) => ({ ...prev, data_ate: e.target.value }))}
                    />
                  </label>
                </div>

                <div className="action-row">
                  <button type="button" onClick={onApplyRepasseReportFilters} disabled={isBusy}>
                    Gerar relatorio
                  </button>
                  <button type="button" className="secondary" onClick={onClearRepasseReportFilters}>
                    Limpar filtros
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => reportData && exportRepasseReportCsv(reportData)}
                    disabled={!reportData}
                  >
                    Exportar CSV
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => reportData && exportRepasseReportExcel(reportData)}
                    disabled={!reportData}
                  >
                    Exportar Excel
                  </button>
                  <button type="button" className="secondary" onClick={() => onExportRepasseReportPdf("executivo")} disabled={!reportData}>
                    PDF Executivo
                  </button>
                  <button type="button" className="secondary" onClick={() => onExportRepasseReportPdf("analitico")} disabled={!reportData}>
                    PDF Analitico
                  </button>
                </div>
              </div>

              {!reportData ? (
                <div className="card table-card">
                  <p>Selecione os filtros e gere o relatorio para visualizar os dados.</p>
                </div>
              ) : (
                <>
                  <div className="report-kpi-grid">
                    <div className="card kpi-card">
                      <p className="eyebrow">Repassado no periodo</p>
                      <h3>{formatCurrency(reportData.kpis.valor_repassado_periodo)}</h3>
                    </div>
                    <div className="card kpi-card">
                      <p className="eyebrow">Qtd repasses</p>
                      <h3>{reportData.kpis.quantidade_repasses}</h3>
                    </div>
                    <div className="card kpi-card">
                      <p className="eyebrow">Saldo pactuado</p>
                      <h3>{formatCurrency(reportData.kpis.saldo_pactuado)}</h3>
                    </div>
                    <div className="card kpi-card">
                      <p className="eyebrow">% repassado</p>
                      <h3>{reportData.kpis.percentual_repassado.toFixed(2)}%</h3>
                    </div>
                  </div>

                  <div className="report-charts-grid">
                    <div className="card">
                      <h3>Evolucao mensal de repasses</h3>
                      <div className="report-bars">
                        {reportData.series.repasses_mensais.length === 0 ? (
                          <p className="subtitle">Sem repasses no periodo.</p>
                        ) : (
                          reportData.series.repasses_mensais.map((item) => {
                            const max = Math.max(...reportData.series.repasses_mensais.map((point) => point.valor), 1);
                            const width = (item.valor / max) * 100;
                            return (
                              <div key={item.mes} className="report-bar-row">
                                <span>{item.mes}</span>
                                <div className="report-bar-track">
                                  <div className="report-bar-fill" style={{ width: `${width}%` }} />
                                </div>
                                <strong>{formatCurrency(item.valor)}</strong>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div className="card">
                      <h3>Repasses por instrumento</h3>
                      <div className="report-bars">
                        {reportData.series.repasses_por_instrumento.length === 0 ? (
                          <p className="subtitle">Sem instrumentos no filtro.</p>
                        ) : (
                          reportData.series.repasses_por_instrumento.map((item) => {
                            const max = Math.max(...reportData.series.repasses_por_instrumento.map((point) => point.valor), 1);
                            const width = (item.valor / max) * 100;
                            return (
                              <div key={item.instrumento_id} className="report-bar-row">
                                <span>{item.instrumento}</span>
                                <div className="report-bar-track">
                                  <div className="report-bar-fill secondary" style={{ width: `${width}%` }} />
                                </div>
                                <strong>{formatCurrency(item.valor)}</strong>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="card table-card">
                    <h3>Instrumentos no relatorio</h3>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Instrumento</th>
                            <th>Status</th>
                            <th>Orgao concedente</th>
                            <th>Banco</th>
                            <th>Agencia</th>
                            <th>Conta</th>
                            <th>Prestacao de contas</th>
                            <th>Empresa vencedora</th>
                            <th>Valor pactuado</th>
                            <th>Ja repassado</th>
                            <th>Saldo</th>
                            <th>% obra</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.instrumentos.length === 0 ? (
                            <tr>
                              <td colSpan={12}>Nenhum instrumento encontrado.</td>
                            </tr>
                          ) : (
                            reportData.instrumentos.map((item) => (
                              <tr key={item.id}>
                                <td>{item.instrumento}</td>
                                <td>{item.status}</td>
                                <td>{item.orgao_concedente}</td>
                                <td>{item.banco ?? "-"}</td>
                                <td>{item.agencia ?? "-"}</td>
                                <td>{item.conta ?? "-"}</td>
                                <td>{item.data_prestacao_contas ?? "-"}</td>
                                <td>{item.empresa_vencedora ?? "-"}</td>
                                <td>{formatCurrency(item.valor_pactuado)}</td>
                                <td>{formatCurrency(item.valor_ja_repassado)}</td>
                                <td>{formatCurrency(item.saldo_pactuado)}</td>
                                <td>{item.percentual_obra === null ? "-" : `${item.percentual_obra.toFixed(2)}%`}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card table-card">
                    <h3>Lista de repasses</h3>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Instrumento</th>
                            <th>Proposta</th>
                            <th>Empresa vencedora</th>
                            <th>Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.repasses.length === 0 ? (
                            <tr>
                              <td colSpan={5}>Nenhum repasse encontrado no periodo.</td>
                            </tr>
                          ) : (
                            reportData.repasses.map((item) => (
                              <tr key={item.id}>
                                <td>{item.data_repasse}</td>
                                <td>{item.instrumento}</td>
                                <td>{item.proposta}</td>
                                <td>{item.empresa_vencedora ?? "-"}</td>
                                <td>{formatCurrency(item.valor_repasse)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
              </>
              ) : (
                <>
                  <div className="card filters-card">
                    <h3>Relatorio de acompanhamento de obras</h3>
                    <div className="filters-grid columns-4">
                      <label>
                        Convenete
                        <select
                          value={obraReportFilters.convenete_id}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({
                              ...prev,
                              convenete_id: e.target.value,
                              instrumento_id: ""
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          {convenetes.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Instrumento
                        <select
                          value={obraReportFilters.instrumento_id}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({ ...prev, instrumento_id: e.target.value }))
                          }
                        >
                          <option value="">Todos</option>
                          {obraReportInstrumentOptions.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {item.instrumento} | proposta {item.proposta}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          value={obraReportFilters.status}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({
                              ...prev,
                              status: e.target.value as InstrumentStatus | ""
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          {STATUS_OPTIONS.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Ativo
                        <select
                          value={obraReportFilters.ativo}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({ ...prev, ativo: e.target.value as "true" | "false" }))
                          }
                        >
                          <option value="true">Sim</option>
                          <option value="false">Nao</option>
                        </select>
                      </label>
                      <label>
                        Data de
                        <input
                          type="date"
                          value={obraReportFilters.data_de}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({ ...prev, data_de: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Data ate
                        <input
                          type="date"
                          value={obraReportFilters.data_ate}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({ ...prev, data_ate: e.target.value }))
                          }
                        />
                      </label>
                    </div>

                    <div className="action-row">
                      <button type="button" onClick={onApplyObraReportFilters} disabled={isBusy}>
                        Gerar relatorio
                      </button>
                      <button type="button" className="secondary" onClick={onClearObraReportFilters}>
                        Limpar filtros
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => obraReportData && exportObraReportCsv(obraReportData)}
                        disabled={!obraReportData}
                      >
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => obraReportData && exportObraReportExcel(obraReportData)}
                        disabled={!obraReportData}
                      >
                        Exportar Excel
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onExportObraReportPdf("executivo")}
                        disabled={!obraReportData}
                      >
                        PDF Executivo
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onExportObraReportPdf("analitico")}
                        disabled={!obraReportData}
                      >
                        PDF Analitico
                      </button>
                    </div>
                  </div>

                  {!obraReportData ? (
                    <div className="card table-card">
                      <p>Selecione os filtros e gere o relatorio para visualizar os dados.</p>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Obras monitoradas</p>
                          <h3>{obraReportData.kpis.obras_monitoradas}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">% medio da obra</p>
                          <h3>{obraReportData.kpis.percentual_medio_obra.toFixed(2)}%</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Boletins no periodo</p>
                          <h3>{formatCurrency(obraReportData.kpis.valor_total_boletins_periodo)}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Risco alto</p>
                          <h3>{obraReportData.kpis.obras_risco_alto}</h3>
                        </div>
                      </div>

                      <div className="report-charts-grid">
                        <div className="card">
                          <h3>Evolucao mensal de boletins</h3>
                          <div className="report-bars">
                            {obraReportData.series.boletins_mensais.length === 0 ? (
                              <p className="subtitle">Sem boletins no periodo.</p>
                            ) : (
                              obraReportData.series.boletins_mensais.map((item) => {
                                const max = Math.max(...obraReportData.series.boletins_mensais.map((point) => point.valor), 1);
                                const width = (item.valor / max) * 100;
                                return (
                                  <div key={item.mes} className="report-bar-row">
                                    <span>{item.mes}</span>
                                    <div className="report-bar-track">
                                      <div className="report-bar-fill" style={{ width: `${width}%` }} />
                                    </div>
                                    <strong>{formatCurrency(item.valor)}</strong>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                        <div className="card">
                          <h3>Evolucao mensal de repasses</h3>
                          <div className="report-bars">
                            {obraReportData.series.repasses_mensais.length === 0 ? (
                              <p className="subtitle">Sem repasses no periodo.</p>
                            ) : (
                              obraReportData.series.repasses_mensais.map((item) => {
                                const max = Math.max(...obraReportData.series.repasses_mensais.map((point) => point.valor), 1);
                                const width = (item.valor / max) * 100;
                                return (
                                  <div key={item.mes} className="report-bar-row">
                                    <span>{item.mes}</span>
                                    <div className="report-bar-track">
                                      <div className="report-bar-fill secondary" style={{ width: `${width}%` }} />
                                    </div>
                                    <strong>{formatCurrency(item.valor)}</strong>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Instrumentos (fluxo obra)</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Instrumento</th>
                                <th>Objeto</th>
                                <th>Status</th>
                                <th>% obra</th>
                                <th>Boletins periodo</th>
                                <th>Repasses periodo</th>
                                <th>Ultimo boletim</th>
                                <th>Prestacao contas</th>
                                <th>Dias vigencia fim</th>
                                <th>Risco</th>
                              </tr>
                            </thead>
                            <tbody>
                              {obraReportData.instrumentos.length === 0 ? (
                                <tr>
                                  <td colSpan={10}>Nenhum instrumento encontrado.</td>
                                </tr>
                              ) : (
                                obraReportData.instrumentos.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.instrumento}</td>
                                    <td>{item.objeto}</td>
                                    <td>{item.status}</td>
                                    <td>{item.percentual_obra.toFixed(2)}%</td>
                                    <td>{formatCurrency(item.valor_boletins_periodo)}</td>
                                    <td>{formatCurrency(item.valor_repasses_periodo)}</td>
                                    <td>
                                      {item.ultimo_boletim_data
                                        ? `${item.ultimo_boletim_data} (${formatCurrency(item.ultimo_boletim_valor ?? 0)})`
                                        : "-"}
                                    </td>
                                    <td>{item.data_prestacao_contas ?? "-"}</td>
                                    <td>{item.dias_para_vigencia_fim}</td>
                                    <td>{item.risco}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </section>
          )}

          {message && <p className="message">{message}</p>}
        </main>
      </div>
    </div>
  );
}
