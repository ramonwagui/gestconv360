import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  askAssistentePergunta,
  askDocumentQuestion,
  addTicketComment,
  addWorkMeasurementBulletin,
  addChecklistItem,
  associateTicketInstrument,
  createUserAdmin,
  seedDemoDataAdmin,
  createChecklistExternalLink,
  deactivateChecklistExternalLink as deactivateChecklistExternalLinkApi,
  createConveneteFromProponente as createProponenteFromBase,
  createCertificate,
  createDocumentAiRequest,
  createDocumentAiRequestPublicLink,
  classifyDocument,
  createDocument,
  createTicket,
  createInstrument,
  deleteWorkMeasurementBulletin,
  deleteConvenete as deleteProponente,
  deleteDocument,
  deactivateDocumentAiRequestPublicLink,
  deactivateInstrument,
  deleteChecklistItem,
  downloadChecklistExternalFile,
  downloadDocument,
  downloadStageFollowUpFile,
  getActiveCertificates,
  getInstrumentById,
  getInstrumentChecklist,
  getMyProfile,
  getObraReport,
  getRepasseReport,
  getTransferenciasDiscricionarias,
  getTransferenciasDiscricionariasDesembolsosPorProponente,
  getTransferenciasDiscricionariasDesembolsos,
  getTransferenciasDiscricionariasFiltros,
  getTransferenciasDiscricionariasProponenteSugestoes,
  getTransferenciasDiscricionariasSyncStatus,
  getConsultaFnsAnos,
  getConsultaFnsMunicipios,
  getConsultaFnsPropostaDetalhe,
  getConsultaFnsPropostas,
  getConsultaFnsStatus,
  getConsultaFnsUfs,
  getFnsEntidades,
  getFnsMunicipios,
  getFnsRepasses,
  getFnsRepassesDetalhe,
  getFnsSaldosTiposConta,
  getFnsSyncStatus,
  getFnsUfs,
  getSimecMunicipios,
  getSimecObraDetalhe,
  getSimecObras,
  getSimecUfs,
  getTransferenciasEspeciaisPlanoAcao,
  getTicketById,
  getWorkProgress,
  healthCheck,
  listAuditLogs,
  listDocuments,
  listConvenetes as listProponentes,
  searchConveneteProponentes as searchProponentesDaBase,
  reimportarInstrumentosProponente,
  reimportarInstrumentosTodosProponentes,
  listDeadlineAlerts,
  listInstruments,
  listInstrumentRepasses,
  listTicketAssignableUsers,
  listTickets,
  listUsersAdmin,
  listSolicitacoesCaixa,
  listCertificates,
  listDocumentAiRequests,
  login,
  removeMyAvatar,
  createStageFollowUp,
  listStageFollowUps,
  revokeCertificate,
  reindexDocument,
  searchDocuments,
  searchDocumentsSemantic,
  searchInstrumentos,
  signDocument,
  syncTransferenciasDiscricionarias,
  syncFnsCache,
  syncConsultaFnsCache,
  updateUserAdmin,
  updateChecklistItem,
  updateTicket,
  updateDocumentAiRequest,
  updateWorkProgress,
  updateInstrument,
  uploadMyAvatar
} from "./api";
import type {
  AssistenteHistoricoItem,
  AssistenteResposta,
  AuditAction,
  AuditLogItem,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistSummary,
  Proponente,
  ProponenteSugestaoItem,
  DocumentAiRequestItem,
  DocumentAiRequestPriority,
  DocumentAiRequestStatus,
  DeadlineAlertItem,
  DocumentSearchResult,
  Instrument,
  InstrumentFlowType,
  InstrumentFilters,
  InstrumentPayload,
  InstrumentStatus,
  ManagedUser,
  ObraReportResponse,
  TransferenciaDiscricionariaFiltrosResponse,
  TransferenciaDiscricionariaDesembolsoResponse,
  TransferenciaDiscricionariaDesembolsoProponenteResponse,
  TransferenciaDiscricionariaProponenteSugestaoItem,
  TransferenciaDiscricionariaResponse,
  ConsultaFnsAnoItem,
  ConsultaFnsMunicipioItem,
  ConsultaFnsPropostaDetalhe,
  ConsultaFnsPropostaItem,
  ConsultaFnsPropostasResponse,
  ConsultaFnsSyncStatus,
  ConsultaFnsUfItem,
  FnsEntidadeItem,
  FnsMunicipioItem,
  FnsRepassesDetalheResponse,
  FnsRepassesResponse,
  FnsSaldosTiposContaResponse,
  FnsSyncStatus,
  FnsUfItem,
  SimecMunicipioItem,
  SimecObraDetalhe,
  SimecObrasResponse,
  SimecUfItem,
  Ticket,
  TicketPriority,
  TicketSource,
  TicketStatus,
  Role,
  RepasseReportResponse,
  TransferenciaEspecialPlanoAcaoResponse,
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

const DOCUMENT_INDEX_STATUS_LABELS: Record<"PENDENTE" | "PROCESSANDO" | "INDEXADO" | "ERRO", string> = {
  PENDENTE: "Pendente",
  PROCESSANDO: "Processando",
  INDEXADO: "Indexado",
  ERRO: "Erro"
};

const DOCUMENT_AI_CATEGORY_LABELS: Record<"CONTRATO" | "OFICIO" | "RELATORIO" | "PRESTACAO_CONTAS" | "COMPROVANTE" | "OUTROS", string> = {
  CONTRATO: "Contrato",
  OFICIO: "Oficio",
  RELATORIO: "Relatorio",
  PRESTACAO_CONTAS: "Prestacao de contas",
  COMPROVANTE: "Comprovante",
  OUTROS: "Outros"
};

const DOCUMENT_AI_RISK_LABELS: Record<"BAIXO" | "MEDIO" | "ALTO" | "CRITICO", string> = {
  BAIXO: "Baixo",
  MEDIO: "Medio",
  ALTO: "Alto",
  CRITICO: "Critico"
};

const DOCUMENT_REQUEST_STATUS_LABELS: Record<DocumentAiRequestStatus, string> = {
  ABERTA: "Aberta",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada"
};

const DOCUMENT_REQUEST_PRIORITY_LABELS: Record<DocumentAiRequestPriority, string> = {
  BAIXA: "Baixa",
  MEDIA: "Media",
  ALTA: "Alta",
  URGENTE: "Urgente"
};

const DOCUMENT_REQUEST_PRIORITY_OPTIONS: DocumentAiRequestPriority[] = ["BAIXA", "MEDIA", "ALTA", "URGENTE"];
const MAX_CONVENIOS_DESEMBOLSO_PDF = 30;
const TRANSFERENCIAS_PAGE_SIZE_MAX = 100;
const DESEMBOLSOS_PAGE_SIZE_MAX = 200;

const FLOW_TYPE_OPTIONS: InstrumentFlowType[] = ["OBRA", "AQUISICAO_EQUIPAMENTOS", "EVENTOS"];

const FLOW_TYPE_LABELS: Record<InstrumentFlowType, string> = {
  OBRA: "Obra",
  AQUISICAO_EQUIPAMENTOS: "Aquisicao de Equipamentos",
  EVENTOS: "Eventos"
};

const BRAZIL_UFS: SimecUfItem[] = [
  { uf: "AC", sigla: "AC", nome: "Acre" },
  { uf: "AL", sigla: "AL", nome: "Alagoas" },
  { uf: "AP", sigla: "AP", nome: "Amapa" },
  { uf: "AM", sigla: "AM", nome: "Amazonas" },
  { uf: "BA", sigla: "BA", nome: "Bahia" },
  { uf: "CE", sigla: "CE", nome: "Ceara" },
  { uf: "DF", sigla: "DF", nome: "Distrito Federal" },
  { uf: "ES", sigla: "ES", nome: "Espirito Santo" },
  { uf: "GO", sigla: "GO", nome: "Goias" },
  { uf: "MA", sigla: "MA", nome: "Maranhao" },
  { uf: "MT", sigla: "MT", nome: "Mato Grosso" },
  { uf: "MS", sigla: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", sigla: "MG", nome: "Minas Gerais" },
  { uf: "PA", sigla: "PA", nome: "Para" },
  { uf: "PB", sigla: "PB", nome: "Paraiba" },
  { uf: "PR", sigla: "PR", nome: "Parana" },
  { uf: "PE", sigla: "PE", nome: "Pernambuco" },
  { uf: "PI", sigla: "PI", nome: "Piaui" },
  { uf: "RJ", sigla: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", sigla: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", sigla: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", sigla: "RO", nome: "Rondonia" },
  { uf: "RR", sigla: "RR", nome: "Roraima" },
  { uf: "SC", sigla: "SC", nome: "Santa Catarina" },
  { uf: "SP", sigla: "SP", nome: "Sao Paulo" },
  { uf: "SE", sigla: "SE", nome: "Sergipe" },
  { uf: "TO", sigla: "TO", nome: "Tocantins" }
];

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

type MenuView =
  | "dashboard"
  | "instrumentos"
  | "proponentes"
  | "usuarios"
  | "auditoria"
  | "tickets"
  | "assistente"
  | "relatorios"
  | "assinaturas";
type StageFollowUpFilter = "TODOS" | "SO_MEUS" | "COM_ANEXO" | "COM_TEXTO";
type ReportPdfMode = "executivo" | "analitico";

type ReportFilters = {
  proponente_id: string;
  instrumento_id: string;
  data_de: string;
  data_ate: string;
};

type ObraReportFilters = {
  proponente_id: string;
  instrumento_id: string;
  status: InstrumentStatus | "";
  ativo: "true" | "false";
  data_de: string;
  data_ate: string;
};

type TransferenciasEspeciaisFilters = {
  cnpj: string;
  nome_beneficiario: string;
  uf: string;
  ano: string;
  situacao: string;
  codigo_plano_acao: string;
  parlamentar: string;
  page_size: string;
};

type TransferenciasDiscricionariasFilters = {
  cnpj: string;
  nome_proponente: string;
  uf: string;
  municipio: string;
  ano: string;
  vigencia_a_vencer_dias: "" | "30" | "60" | "90";
  situacao_proposta: string;
  situacao_convenio: string;
  nr_convenio: string;
  nr_proposta: string;
  tipo_ente: "" | "estado" | "municipio";
  page_size: string;
};

type TransferenciasDiscricionariasDesembolsoFilters = {
  nr_convenio: string;
  ano: string;
  mes: string;
  page_size: string;
};

type TransferenciasDiscricionariasProponenteDesembolsoFilters = {
  cnpj: string;
  nome_proponente: string;
  ano: string;
  mes: string;
  page_size: string;
};

type TransferenciasDiscricionariasTab = "convenios" | "proponente";

type FnsRepassesFilters = {
  ano: string;
  uf_id: string;
  co_ibge_municipio: string;
  cnpj: string;
  codigo_bloco: string;
};

type ConsultaFnsFilters = {
  ano: string;
  uf: string;
  co_municipio_ibge: string;
  nu_proposta: string;
  tp_proposta: string;
  tp_recurso: string;
  tp_emenda: string;
  count: string;
};

type SimecObrasFilters = {
  uf: string;
  muncod: string;
  esfera: string;
  tipologia: string;
  obrid: string;
  vigencia_status: "" | "vencidas" | "30" | "60" | "90";
};

type RelatorioTab =
  | "repasses"
  | "obras"
  | "tickets"
  | "transferencias_especiais"
  | "transferencias_discricionarias"
  | "fns_repasses"
  | "consultafns_propostas"
  | "simec_obras";
type TicketBoardTab = "abertos" | "resolvidos" | "cancelados";
type SignatureTab = "certificados" | "documentos";

type TicketFilters = {
  status: TicketStatus | "";
  prioridade: TicketPriority | "";
  origem: TicketSource | "";
  somente_atrasados: boolean;
  instrument_id: string;
  responsavel_user_id: string;
  q: string;
};

type TicketReportFilters = {
  status: TicketStatus | "";
  prioridade: TicketPriority | "";
  origem: TicketSource | "";
  responsavel_user_id: string;
  somente_atrasados: boolean;
  q: string;
  data_de: string;
  data_ate: string;
};

type TechnicalRouteStatus = "checking" | "ok" | "missing" | "error";

type TechnicalHealthState = {
  backendVersion: string;
  reportRouteStatus: TechnicalRouteStatus;
  lastCheckedAt: string | null;
};

type AssistenteChatItem = {
  id: number;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  intencao?: AssistenteResposta["intencao"];
  contextoUsado?: boolean;
  perguntaInterpretada?: string;
};

const STAGE_FOLLOW_UP_FILTER_LABELS: Record<StageFollowUpFilter, string> = {
  TODOS: "Todos",
  SO_MEUS: "So meus",
  COM_ANEXO: "Com anexo",
  COM_TEXTO: "Com texto"
};

type ProponenteCadastroState = {
  busca: string;
  cnpj_selecionado: string;
};

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
  proponente_id: string;
  status: InstrumentStatus;
  responsavel: string;
  orgao_executor: string;
  empresa_vencedora: string;
  cnpj_vencedora: string;
  valor_vencedor: string;
  observacoes: string;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const formatChatTime = (value: string) =>
  new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  });

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

const readTicketIdFromSearch = (search: string): number | null => {
  const params = new URLSearchParams(search);
  const raw = params.get("ticket");
  if (!raw) {
    return null;
  }

  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
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

const getDaysUntilDate = (value: string) => {
  const dueDate = parseDateOnly(value);
  if (!dueDate) {
    return null;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  return Math.floor((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));
};

const formatRelativeTimeFromIso = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "agora";
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return "agora";
  }
  if (diffMinutes < 60) {
    return `ha ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `ha ${diffHours}h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `ha ${diffDays}d`;
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

const isTicketOverdue = (ticket: Ticket) => {
  if (!ticket.prazo_alvo) {
    return false;
  }
  if (ticket.status !== "ABERTO" && ticket.status !== "EM_ANDAMENTO") {
    return false;
  }
  const dueDate = parseDateOnly(ticket.prazo_alvo);
  if (!dueDate) {
    return false;
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dueUtc = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  return dueUtc < todayUtc;
};

const formatTicketInstrumentLabel = (ticket: Ticket, emptyLabel = "Sem instrumento") => {
  if (ticket.instrumento) {
    const base = `${ticket.instrumento.instrumento} (proposta ${ticket.instrumento.proposta})`;
    const objeto = normalizeReadableText(ticket.instrumento.objeto)?.trim();
    if (objeto) {
      return `${base} - Objeto: ${objeto}`;
    }
    return base;
  }

  return ticket.instrumento_informado ?? emptyLabel;
};

const moveUpdatedTicketToTop = (items: Ticket[], updated: Ticket) => {
  return [updated, ...items.filter((item) => item.id !== updated.id)];
};

const resolveConsultaFnsNuProposta = (item: ConsultaFnsPropostaItem) => {
  const direct = (item.nuProposta ?? "").trim();
  if (direct !== "") {
    return direct;
  }

  const fromLinha = item.linhaPropostas?.find((entry) => (entry.nuProposta ?? "").trim() !== "")?.nuProposta;
  return (fromLinha ?? "").trim();
};

const escapeHtml = (value: string) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  proponente_id: "",
  sync_repasses_desembolsos: "false",
  ativo: "true",
  vigencia_de: "",
  vigencia_ate: ""
});

const emptyReportFilters = (): ReportFilters => ({
  proponente_id: "",
  instrumento_id: "",
  data_de: "",
  data_ate: ""
});

const emptyObraReportFilters = (): ObraReportFilters => ({
  proponente_id: "",
  instrumento_id: "",
  status: "",
  ativo: "true",
  data_de: "",
  data_ate: ""
});

const emptyTransferenciasEspeciaisFilters = (): TransferenciasEspeciaisFilters => ({
  cnpj: "",
  nome_beneficiario: "",
  uf: "",
  ano: "",
  situacao: "",
  codigo_plano_acao: "",
  parlamentar: "",
  page_size: "20"
});

const emptyTransferenciasDiscricionariasFilters = (): TransferenciasDiscricionariasFilters => ({
  cnpj: "",
  nome_proponente: "",
  uf: "",
  municipio: "",
  ano: "",
  vigencia_a_vencer_dias: "",
  situacao_proposta: "",
  situacao_convenio: "",
  nr_convenio: "",
  nr_proposta: "",
  tipo_ente: "",
  page_size: "20"
});

const emptyTransferenciasDiscricionariasDesembolsoFilters = (): TransferenciasDiscricionariasDesembolsoFilters => ({
  nr_convenio: "",
  ano: "",
  mes: "",
  page_size: "50"
});

const emptyTransferenciasDiscricionariasProponenteDesembolsoFilters =
  (): TransferenciasDiscricionariasProponenteDesembolsoFilters => ({
    cnpj: "",
    nome_proponente: "",
    ano: "",
    mes: "",
    page_size: "100"
  });

const emptyFnsRepassesFilters = (): FnsRepassesFilters => ({
  ano: String(new Date().getFullYear()),
  uf_id: "",
  co_ibge_municipio: "",
  cnpj: "",
  codigo_bloco: ""
});

const emptyConsultaFnsFilters = (): ConsultaFnsFilters => ({
  ano: String(new Date().getFullYear()),
  uf: "",
  co_municipio_ibge: "",
  nu_proposta: "",
  tp_proposta: "",
  tp_recurso: "",
  tp_emenda: "",
  count: "20"
});

const emptySimecObrasFilters = (): SimecObrasFilters => ({
  uf: "",
  muncod: "",
  esfera: "",
  tipologia: "",
  obrid: "",
  vigencia_status: ""
});

const emptyAssistenteConversa = (): AssistenteChatItem[] => [];

const emptyTicketFilters = (): TicketFilters => ({
  status: "",
  prioridade: "",
  origem: "",
  somente_atrasados: false,
  instrument_id: "",
  responsavel_user_id: "",
  q: ""
});

const emptyTicketReportFilters = (): TicketReportFilters => ({
  status: "",
  prioridade: "",
  origem: "",
  responsavel_user_id: "",
  somente_atrasados: false,
  q: "",
  data_de: "",
  data_ate: ""
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
  proponente_id: "",
  status: "EM_ELABORACAO",
  responsavel: "",
  orgao_executor: "",
  empresa_vencedora: "",
  cnpj_vencedora: "",
  valor_vencedor: formatCurrencyInput(0),
  observacoes: ""
});

const emptyProponenteCadastroState = (): ProponenteCadastroState => ({
  busca: "",
  cnpj_selecionado: ""
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
  const valorVencedor = parseCurrencyInput(form.valor_vencedor);

  if (Number.isNaN(valorRepasse) || Number.isNaN(valorContrapartida) || Number.isNaN(valorVencedor)) {
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
    proponente_id: asOptionalNumber(form.proponente_id),
    status: form.status,
    responsavel: asOptional(form.responsavel),
    orgao_executor: asOptional(form.orgao_executor),
    empresa_vencedora: asOptional(form.empresa_vencedora),
    cnpj_vencedora: asOptional(form.cnpj_vencedora),
    valor_vencedor: valorVencedor > 0 ? valorVencedor : undefined,
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
  proponente_id: item.proponente_id ? String(item.proponente_id) : item.convenete_id ? String(item.convenete_id) : "",
  status: item.status,
  responsavel: item.responsavel ?? "",
  orgao_executor: item.orgao_executor ?? "",
  empresa_vencedora: item.empresa_vencedora ?? "",
  cnpj_vencedora: item.cnpj_vencedora ?? "",
  valor_vencedor: formatCurrencyInput(item.valor_vencedor ?? 0),
  observacoes: item.observacoes ?? ""
});

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatCnpj = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

const normalizeReadableText = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return value;
  }
  const hasSuspiciousEncoding = /[ÃÂ�\u0080-\u009F]/.test(value);
  if (!hasSuspiciousEncoding) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value).map((char) => char.charCodeAt(0) & 0xff));
    const repaired = new TextDecoder("utf-8").decode(bytes);
    if (repaired.includes("\uFFFD")) {
      return value.replace(/[\u0080-\u009F]/g, "");
    }
    return repaired.replace(/[\u0080-\u009F]/g, "");
  } catch {
    return value.replace(/[\u0080-\u009F]/g, "");
  }
};

const normalizeReadableTextSafe = (value: string | null | undefined, fallback = "-") => {
  const normalized = normalizeReadableText(value);
  if (normalized === null || normalized === undefined) {
    return fallback;
  }
  const trimmed = normalized.trim();
  return trimmed === "" ? fallback : trimmed;
};

const loadIbgeMunicipiosByUf = async (uf: string): Promise<SimecMunicipioItem[]> => {
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios`);
  if (!res.ok) {
    throw new Error(`Falha ao consultar municipios no IBGE (${res.status}).`);
  }

  const payload = (await res.json()) as Array<{ id?: number; nome?: string }>;
  return payload
    .map((item) => ({
      codigo: String(item.id ?? "").trim(),
      uf,
      nome: String(item.nome ?? "").trim()
    }))
    .filter((item) => item.codigo !== "" && item.nome !== "")
    .sort((a, b) => a.nome.localeCompare(b.nome));
};

const parseConvenioList = (value: string) => {
  const set = new Set<string>();
  for (const part of value.split(/[\n,;]+/)) {
    const cleaned = part.trim();
    if (cleaned !== "") {
      set.add(cleaned);
    }
  }
  return Array.from(set);
};

type DesembolsoParcelaItem = {
  id: number;
  id_desembolso: number | null;
  nr_convenio: string | null;
  data_desembolso: string | null;
};

const buildDesembolsoParcelaMap = (items: DesembolsoParcelaItem[]) => {
  const groups = new Map<string, DesembolsoParcelaItem[]>();

  for (const item of items) {
    const convenioKey = item.nr_convenio?.trim() ? item.nr_convenio.trim() : `sem-convenio-${item.id}`;
    const current = groups.get(convenioKey);
    if (current) {
      current.push(item);
    } else {
      groups.set(convenioKey, [item]);
    }
  }

  const parcelaById = new Map<number, number>();

  for (const [, groupItems] of groups) {
    const sorted = [...groupItems].sort((a, b) => {
      const dateA = a.data_desembolso ?? "9999-12-31";
      const dateB = b.data_desembolso ?? "9999-12-31";
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const idA = a.id_desembolso ?? a.id;
      const idB = b.id_desembolso ?? b.id;
      return idA - idB;
    });

    sorted.forEach((item, index) => {
      parcelaById.set(item.id, index + 1);
    });
  }

  return parcelaById;
};

const getReportLogoUrl = () => new URL("/api/v1/public/brand-logo", window.location.origin).toString();

const getDeferredPrintScript = () =>
  `<script>(function(){let printed=false;const run=()=>{if(printed)return;printed=true;setTimeout(()=>window.print(),120);};const img=document.getElementById("report-logo");if(!img){run();return;}if(img.complete){run();return;}img.addEventListener("load",run,{once:true});img.addEventListener("error",run,{once:true});setTimeout(run,2000);})();</script>`;

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
  link.download = `relatorio-repasses-${report.filtros.proponente_id ?? report.filtros.convenete_id}-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportRepasseReportExcel = (report: RepasseReportResponse) => {
  const proponenteNome = report.filtros.proponente_nome ?? report.filtros.convenete_nome;
  const proponenteCnpj = report.filtros.proponente_cnpj ?? report.filtros.convenete_cnpj;

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

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><h3>Resumo</h3><table border="1"><tbody><tr><td>Proponente</td><td>${proponenteNome}</td></tr><tr><td>CNPJ</td><td>${proponenteCnpj}</td></tr><tr><td>Valor repassado no periodo</td><td>${report.kpis.valor_repassado_periodo}</td></tr><tr><td>Quantidade de repasses</td><td>${report.kpis.quantidade_repasses}</td></tr><tr><td>% repassado</td><td>${report.kpis.percentual_repassado.toFixed(2)}%</td></tr></tbody></table><h3>Repasses</h3><table border="1"><thead><tr><th>ID</th><th>Instrumento ID</th><th>Proposta</th><th>Instrumento</th><th>Data</th><th>Valor</th><th>Empresa vencedora</th></tr></thead><tbody>${repasseRows}</tbody></table><h3>Instrumentos</h3><table border="1"><thead><tr><th>ID</th><th>Proposta</th><th>Instrumento</th><th>Status</th><th>Orgao concedente</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Prestacao de contas</th><th>Empresa vencedora</th><th>Valor pactuado</th><th>Valor ja repassado</th><th>Repassado no periodo</th><th>Saldo</th></tr></thead><tbody>${instrumentoRows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-repasses-${report.filtros.proponente_id ?? report.filtros.convenete_id}-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportRepasseReportPdf = (report: RepasseReportResponse, mode: ReportPdfMode) => {
  const proponenteNome = report.filtros.proponente_nome ?? report.filtros.convenete_nome;
  const proponenteCnpj = report.filtros.proponente_cnpj ?? report.filtros.convenete_cnpj;

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

  const logoUrl = getReportLogoUrl();
  const printScript = getDeferredPrintScript();

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio de repasses</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body><div class="report-head"><img id="report-logo" src="${logoUrl}" alt="NC Convenios" /><h1>Relatorio de repasses (${mode})</h1></div><p><strong>Proponente:</strong> ${proponenteNome} (${proponenteCnpj})</p><p><strong>Periodo:</strong> ${report.filtros.data_de ?? "inicio"} ate ${report.filtros.data_ate ?? "hoje"}</p><div class="kpi"><div><strong>Repassado no periodo</strong><br/>${formatCurrency(report.kpis.valor_repassado_periodo)}</div><div><strong>Qtd repasses</strong><br/>${report.kpis.quantidade_repasses}</div><div><strong>Valor pactuado</strong><br/>${formatCurrency(report.kpis.valor_pactuado)}</div><div><strong>% repassado</strong><br/>${report.kpis.percentual_repassado.toFixed(2)}%</div></div>${mode === "analitico" ? `<h2>Instrumentos</h2><table><thead><tr><th>Instrumento</th><th>Status</th><th>Orgao concedente</th><th>Banco</th><th>Agencia</th><th>Conta</th><th>Prestacao de contas</th><th>Pactuado</th><th>Ja repassado</th><th>Saldo</th></tr></thead><tbody>${instrumentRows}</tbody></table>` : ""}<h2>Repasses</h2><table><thead><tr><th>Data</th><th>Instrumento</th><th>Valor</th><th>Empresa vencedora</th></tr></thead><tbody>${repasseRows}</tbody></table>${printScript}</body></html>`);
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

  const logoUrl = getReportLogoUrl();
  const printScript = getDeferredPrintScript();

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio de obras</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left}.kpi{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body><div class="report-head"><img id="report-logo" src="${logoUrl}" alt="NC Convenios" /><h1>Relatorio de obras (${mode})</h1></div><p><strong>Periodo:</strong> ${report.filtros.data_de ?? "inicio"} ate ${report.filtros.data_ate ?? "hoje"}</p><div class="kpi"><div><strong>Obras monitoradas</strong><br/>${report.kpis.obras_monitoradas}</div><div><strong>% medio da obra</strong><br/>${report.kpis.percentual_medio_obra.toFixed(2)}%</div><div><strong>Boletins no periodo</strong><br/>${formatCurrency(report.kpis.valor_total_boletins_periodo)}</div><div><strong>Repasses no periodo</strong><br/>${formatCurrency(report.kpis.valor_total_repasses_periodo)}</div><div><strong>Risco alto</strong><br/>${report.kpis.obras_risco_alto}</div></div>${mode === "analitico" ? `<h2>Instrumentos</h2><table><thead><tr><th>Instrumento</th><th>Objeto</th><th>Status</th><th>% obra</th><th>Dias vigencia fim</th><th>Risco</th><th>Boletins periodo</th><th>Repasses periodo</th></tr></thead><tbody>${instrumentRows}</tbody></table>` : ""}${printScript}</body></html>`);
  popup.document.close();
};

const exportTicketReportCsv = (items: Ticket[]) => {
  const columns = [
    "codigo",
    "status",
    "prioridade",
    "origem",
    "criado_por",
    "responsavel",
    "titulo",
    "instrumento",
    "prazo_alvo",
    "sla",
    "atrasado",
    "created_at",
    "updated_at",
    "resolvido_em"
  ] as const;

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = items.map((item) => {
    const row = {
      codigo: item.codigo,
      status: TICKET_STATUS_LABELS[item.status],
      prioridade: TICKET_PRIORITY_LABELS[item.prioridade],
      origem: TICKET_SOURCE_LABELS[item.origem],
      criado_por: item.criado_por.nome,
      responsavel: item.responsavel?.nome ?? "Nao atribuido",
      titulo: item.titulo,
      instrumento: formatTicketInstrumentLabel(item),
      prazo_alvo: item.prazo_alvo ?? "",
      sla: formatTicketSla(item),
      atrasado: isTicketOverdue(item) ? "SIM" : "NAO",
      created_at: new Date(item.created_at).toLocaleString("pt-BR"),
      updated_at: new Date(item.updated_at).toLocaleString("pt-BR"),
      resolvido_em: item.resolvido_em ? new Date(item.resolvido_em).toLocaleString("pt-BR") : ""
    };

    return columns.map((col) => toCsvCell(row[col])).join(";");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-tickets-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportTicketReportExcel = (items: Ticket[]) => {
  const rows = items
    .map(
      (item) =>
        `<tr><td>${item.codigo}</td><td>${TICKET_STATUS_LABELS[item.status]}</td><td>${TICKET_PRIORITY_LABELS[item.prioridade]}</td><td>${TICKET_SOURCE_LABELS[item.origem]}</td><td>${item.criado_por.nome}</td><td>${item.responsavel?.nome ?? "Nao atribuido"}</td><td>${item.titulo}</td><td>${formatTicketInstrumentLabel(item)}</td><td>${item.prazo_alvo ?? ""}</td><td>${formatTicketSla(item)}</td><td>${isTicketOverdue(item) ? "SIM" : "NAO"}</td><td>${new Date(item.created_at).toLocaleString("pt-BR")}</td><td>${new Date(item.updated_at).toLocaleString("pt-BR")}</td><td>${item.resolvido_em ? new Date(item.resolvido_em).toLocaleString("pt-BR") : ""}</td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><h3>Relatorio de tickets</h3><table border="1"><thead><tr><th>Codigo</th><th>Status</th><th>Prioridade</th><th>Origem</th><th>Criado por</th><th>Atribuido</th><th>Titulo</th><th>Instrumento</th><th>Prazo alvo</th><th>SLA</th><th>Atrasado</th><th>Criado em</th><th>Atualizado em</th><th>Resolvido em</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-tickets-${todayDate()}.xls`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportTransferenciasEspeciaisCsv = (report: TransferenciaEspecialPlanoAcaoResponse) => {
  const columns = [
    "id_plano_acao",
    "codigo_plano_acao",
    "ano_plano_acao",
    "modalidade_plano_acao",
    "situacao_plano_acao",
    "nome_beneficiario_plano_acao",
    "uf_beneficiario_plano_acao",
    "cnpj_beneficiario_plano_acao",
    "nome_parlamentar_emenda_plano_acao",
    "valor_custeio_plano_acao",
    "valor_investimento_plano_acao",
    "id_programa"
  ] as const;
  type CsvColumn = (typeof columns)[number];

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = report.itens.map((item) => {
    const row = item as unknown as Record<CsvColumn, string | number | null>;
    return columns.map((col) => toCsvCell(row[col])).join(";");
  });

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `relatorio-transferencias-especiais-p${report.paginacao.pagina}-${todayDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

const exportTransferenciasEspeciaisPdf = (
  report: TransferenciaEspecialPlanoAcaoResponse,
  mode: ReportPdfMode = "analitico"
) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const totalCusteio = report.itens.reduce((acc, item) => acc + item.valor_custeio_plano_acao, 0);
  const totalInvestimento = report.itens.reduce((acc, item) => acc + item.valor_investimento_plano_acao, 0);

  const rows = report.itens
    .map(
      (item) =>
        `<tr><td>${item.id_plano_acao}</td><td>${item.codigo_plano_acao}</td><td>${item.ano_plano_acao}</td><td>${item.situacao_plano_acao}</td><td>${item.nome_beneficiario_plano_acao}</td><td>${item.uf_beneficiario_plano_acao}</td><td>${item.cnpj_beneficiario_plano_acao}</td><td>${item.nome_parlamentar_emenda_plano_acao ?? "-"}</td><td style="text-align:right">${formatCurrency(item.valor_custeio_plano_acao)}</td><td style="text-align:right">${formatCurrency(item.valor_investimento_plano_acao)}</td></tr>`
    )
    .join("");

  const logoUrl = getReportLogoUrl();
  const printScript = getDeferredPrintScript();

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Transferencias especiais</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body><div class="report-head"><img id="report-logo" src="${logoUrl}" alt="NC Convenios" /><h1>Transferencias especiais (${mode})</h1></div><div class="kpi"><div><strong>Total de registros</strong><br/>${report.paginacao.total}</div><div><strong>Pagina</strong><br/>${report.paginacao.pagina}/${report.paginacao.total_paginas}</div><div><strong>Total custeio (pagina)</strong><br/>${formatCurrency(totalCusteio)}</div><div><strong>Total investimento (pagina)</strong><br/>${formatCurrency(totalInvestimento)}</div></div>${mode === "analitico" ? `<h2>Planos de acao especial</h2><table><thead><tr><th>ID</th><th>Codigo</th><th>Ano</th><th>Situacao</th><th>Beneficiario</th><th>UF</th><th>CNPJ</th><th>Parlamentar</th><th>Custeio</th><th>Investimento</th></tr></thead><tbody>${rows}</tbody></table>` : ""}${printScript}</body></html>`);
  popup.document.close();
};

const exportTransferenciasDiscricionariasProponenteDesembolsosPdf = (
  report: TransferenciaDiscricionariaDesembolsoProponenteResponse,
  mode: ReportPdfMode = "analitico"
) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const parcelaById = buildDesembolsoParcelaMap(report.itens);
  const rows = report.itens
    .map(
      (item) =>
        `<tr><td>${parcelaById.get(item.id) ?? "-"}a parcela</td><td>${item.id_desembolso ?? "-"}</td><td>${item.nr_convenio ?? "-"}</td><td>${normalizeReadableText(item.objeto) ?? "-"}</td><td style="text-align:right">${item.valor_contrapartida_financeira === null ? "-" : formatCurrency(item.valor_contrapartida_financeira)}</td><td>${item.data_desembolso ? formatDateOnlyPtBr(item.data_desembolso) : "-"}</td><td>${item.ano_desembolso ?? "-"}</td><td>${item.mes_desembolso ?? "-"}</td><td>${item.nr_siafi ?? "-"}</td><td>${item.ug_emitente_dh ?? "-"}</td><td style="text-align:right">${item.vl_desembolsado === null ? "-" : formatCurrency(item.vl_desembolsado)}</td><td>${item.observacao_dh ?? "-"}</td></tr>`
    )
    .join("");

  const logoUrl = getReportLogoUrl();
  const printScript = getDeferredPrintScript();
  const proponenteLabel = report.resumo.nome_proponente ?? "Nao informado";
  const cnpjLabel = report.resumo.cnpj ? formatCnpj(report.resumo.cnpj) : "Nao informado";

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Desembolsos por proponente</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body><div class="report-head"><img id="report-logo" src="${logoUrl}" alt="NC Convenios" /><h1>Desembolsos por proponente (${mode})</h1></div><p><strong>Proponente:</strong> ${proponenteLabel}</p><p><strong>CNPJ:</strong> ${cnpjLabel}</p><div class="kpi"><div><strong>Total de desembolsos</strong><br/>${report.resumo.total_desembolsos}</div><div><strong>Total de convenios</strong><br/>${report.resumo.total_convenios}</div><div><strong>Valor total desembolsado</strong><br/>${formatCurrency(report.resumo.valor_total_desembolsado)}</div><div><strong>Data da carga</strong><br/>${report.sincronizacao.data_carga_fonte ?? "Nao informada"}</div></div>${mode === "analitico" ? `<h2>Desembolsos</h2><table><thead><tr><th>Parcela</th><th>ID desembolso</th><th>Convenio</th><th>Objeto</th><th>Contrapartida</th><th>Data</th><th>Ano</th><th>Mes</th><th>SIAFI</th><th>UG emitente</th><th>Valor</th><th>Observacao</th></tr></thead><tbody>${rows}</tbody></table>` : ""}${printScript}</body></html>`);
  popup.document.close();
};

const exportTransferenciasDiscricionariasPdf = (
  report: TransferenciaDiscricionariaResponse,
  mode: ReportPdfMode = "analitico",
  desembolsoReports: TransferenciaDiscricionariaDesembolsoResponse[] = [],
  targetPopup?: Window | null
) => {
  const popup = targetPopup ?? window.open("", "_blank");
  if (!popup) {
    return;
  }

  const rows = report.itens
    .map(
      (item) =>
        `<tr><td>${item.nr_proposta ?? "-"}</td><td>${item.nr_convenio ?? "-"}</td><td>${item.uf ?? "-"}</td><td>${item.nome_proponente ?? "-"}</td><td>${normalizeReadableText(item.objeto) ?? "-"}</td><td>${item.situacao_proposta ?? "-"}</td><td>${item.situacao_convenio ?? "-"}</td><td>${item.ano_referencia ?? "-"}</td><td>${item.dia_inic_vigencia ?? "-"}</td><td>${item.dia_fim_vigencia ?? "-"}</td><td>${item.dt_conclusao_prestacao_contas ?? "-"}</td><td style="text-align:right">${item.valor_contrapartida_financeira === null ? "-" : formatCurrency(item.valor_contrapartida_financeira)}</td><td style="text-align:right">${item.valor_global_conv === null ? "-" : formatCurrency(item.valor_global_conv)}</td><td style="text-align:right">${item.valor_desembolsado_conv === null ? "-" : formatCurrency(item.valor_desembolsado_conv)}</td></tr>`
    )
    .join("");

  const hasDesembolsoDetails = mode === "analitico" && desembolsoReports.length > 0;
  const desembolsoSections = hasDesembolsoDetails
    ? desembolsoReports
        .map((desembolsoReport) => {
          const parcelaById = buildDesembolsoParcelaMap(desembolsoReport.itens);
          const desembolsoRows = [...desembolsoReport.itens]
            .sort((a, b) => {
              const parcelaA = parcelaById.get(a.id) ?? Number.MAX_SAFE_INTEGER;
              const parcelaB = parcelaById.get(b.id) ?? Number.MAX_SAFE_INTEGER;
              if (parcelaA !== parcelaB) {
                return parcelaA - parcelaB;
              }

              const dateA = a.data_desembolso ?? "9999-12-31";
              const dateB = b.data_desembolso ?? "9999-12-31";
              if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
              }

              const idA = a.id_desembolso ?? a.id;
              const idB = b.id_desembolso ?? b.id;
              return idA - idB;
            })
            .map(
              (item) =>
                `<tr><td>${parcelaById.get(item.id) ?? "-"}a parcela</td><td>${item.id_desembolso ?? "-"}</td><td>${item.data_desembolso ? formatDateOnlyPtBr(item.data_desembolso) : "-"}</td><td>${item.dt_ult_desembolso ? formatDateOnlyPtBr(item.dt_ult_desembolso) : "-"}</td><td>${item.ano_desembolso ?? "-"}</td><td>${item.mes_desembolso ?? "-"}</td><td>${item.qtd_dias_sem_desembolso ?? "-"}</td><td>${item.nr_siafi ?? "-"}</td><td>${item.ug_emitente_dh ?? "-"}</td><td style="text-align:right">${item.vl_desembolsado === null ? "-" : formatCurrency(item.vl_desembolsado)}</td><td>${item.observacao_dh ?? "-"}</td></tr>`
            )
            .join("");

          return `<h2>Historico de desembolsos do convenio ${desembolsoReport.resumo.nr_convenio}</h2><table><thead><tr><th>Parcela</th><th>ID desembolso</th><th>Data</th><th>Ult. desembolso</th><th>Ano</th><th>Mes</th><th>Dias sem desembolso</th><th>Nr SIAFI</th><th>UG emitente</th><th>Valor</th><th>Observacao</th></tr></thead><tbody>${desembolsoRows}</tbody></table>`;
        })
        .join("")
    : "";

  const logoUrl = getReportLogoUrl();
  const printScript = getDeferredPrintScript();

  popup.document.open();
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Transferencias discricionarias</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:11px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body><div class="report-head"><img id="report-logo" src="${logoUrl}" alt="NC Convenios" /><h1>Transferencias discricionarias (${mode})</h1></div><div class="kpi"><div><strong>Total registros</strong><br/>${report.paginacao.total}</div><div><strong>Pagina</strong><br/>${report.paginacao.pagina}/${report.paginacao.total_paginas}</div><div><strong>Status sincronizacao</strong><br/>${report.sincronizacao.status}</div><div><strong>Data carga</strong><br/>${report.sincronizacao.data_carga_fonte ?? "Nao informada"}</div></div>${mode === "analitico" ? `<h2>Propostas e convenios</h2><table><thead><tr><th>Nr proposta</th><th>Nr convenio</th><th>UF</th><th>Proponente</th><th>Objeto</th><th>Situacao proposta</th><th>Situacao convenio</th><th>Ano</th><th>Inicio vigencia</th><th>Fim vigencia</th><th>Prestacao contas</th><th>Contrapartida</th><th>Valor global</th><th>Desembolsado</th></tr></thead><tbody>${rows}</tbody></table>` : ""}${desembolsoSections}${printScript}</body></html>`);
  popup.document.close();
};

const exportTicketReportPdf = (items: Ticket[], mode: ReportPdfMode) => {
  const popup = window.open("", "_blank");
  if (!popup) {
    return;
  }

  const total = items.length;
  const abertos = items.filter((item) => item.status === "ABERTO" || item.status === "EM_ANDAMENTO").length;
  const resolvidos = items.filter((item) => item.status === "RESOLVIDO").length;
  const atrasados = items.filter((item) => isTicketOverdue(item)).length;
  const semAtribuicao = items.filter((item) => !item.responsavel).length;

  const tempoResolucaoDias = items
    .filter((item) => item.resolvido_em)
    .map((item) => {
      const started = new Date(item.created_at).getTime();
      const resolved = new Date(item.resolvido_em as string).getTime();
      return Math.max(0, (resolved - started) / (1000 * 60 * 60 * 24));
    });
  const tempoMedioResolucaoDias =
    tempoResolucaoDias.length === 0
      ? 0
      : tempoResolucaoDias.reduce((acc, value) => acc + value, 0) / tempoResolucaoDias.length;

  const rows = items
    .map(
      (item) =>
        `<tr><td>${item.codigo}</td><td>${item.titulo}</td><td>${TICKET_STATUS_LABELS[item.status]}</td><td>${TICKET_PRIORITY_LABELS[item.prioridade]}</td><td>${item.responsavel?.nome ?? "Nao atribuido"}</td><td>${item.prazo_alvo ?? "-"}</td><td>${formatTicketSla(item)}</td><td>${new Date(item.created_at).toLocaleString("pt-BR")}</td><td>${item.resolvido_em ? new Date(item.resolvido_em).toLocaleString("pt-BR") : "-"}</td></tr>`
    )
    .join("");

  const logoUrl = getReportLogoUrl();
  const printScript = getDeferredPrintScript();

  popup.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Relatorio de tickets</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 12px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #cbd5e1;padding:8px;font-size:12px;text-align:left;vertical-align:top}.kpi{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin:16px 0}.kpi div{border:1px solid #cbd5e1;border-radius:8px;padding:10px}</style></head><body><div class="report-head"><img id="report-logo" src="${logoUrl}" alt="NC Convenios" /><h1>Relatorio de tickets (${mode})</h1></div><div class="kpi"><div><strong>Total</strong><br/>${total}</div><div><strong>Em aberto</strong><br/>${abertos}</div><div><strong>Resolvidos</strong><br/>${resolvidos}</div><div><strong>Atrasados</strong><br/>${atrasados}</div><div><strong>Sem atribuicao</strong><br/>${semAtribuicao}</div><div><strong>Tempo medio resolucao</strong><br/>${tempoMedioResolucaoDias.toFixed(1)} dia(s)</div></div>${mode === "analitico" ? `<h2>Tickets</h2><table><thead><tr><th>Codigo</th><th>Titulo</th><th>Status</th><th>Prioridade</th><th>Atribuido</th><th>Prazo alvo</th><th>SLA</th><th>Criado em</th><th>Resolvido em</th></tr></thead><tbody>${rows}</tbody></table>` : ""}${printScript}</body></html>`);
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
  const [activeView, setActiveView] = useState<MenuView>(() => {
    if (readInstrumentIdFromPath(window.location.pathname)) {
      return "instrumentos";
    }
    if (readTicketIdFromSearch(window.location.search)) {
      return "tickets";
    }
    return "dashboard";
  });
  const [instrumentPageId, setInstrumentPageId] = useState<number | null>(() =>
    readInstrumentIdFromPath(window.location.pathname)
  );
  const [menuTransition, setMenuTransition] = useState<"" | "menu-to-tickets" | "menu-from-tickets">("");
  const menuTransitionTimeoutRef = useRef<number | null>(null);
  const assistenteTypingIntervalRef = useRef<number | null>(null);
  const assistenteChatLogRef = useRef<HTMLDivElement | null>(null);
  const [assistenteTypingMessageId, setAssistenteTypingMessageId] = useState<number | null>(null);

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
  const [empresaVencedoraNomeInput, setEmpresaVencedoraNomeInput] = useState("");
  const [empresaVencedoraCnpjInput, setEmpresaVencedoraCnpjInput] = useState("");
  const [empresaVencedoraValorInput, setEmpresaVencedoraValorInput] = useState(formatCurrencyInput(0));
  const [showSolicitacoesCaixaPanel, setShowSolicitacoesCaixaPanel] = useState(false);
  const [solicitacoesCaixaItens, setSolicitacoesCaixaItens] = useState<any[]>([]);
  const [solicitacoesCaixaLoading, setSolicitacoesCaixaLoading] = useState(false);
  const [ticketInstrumentSearch, setTicketInstrumentSearch] = useState("");
  const [ticketInstrumentResults, setTicketInstrumentResults] = useState<any[]>([]);
  const [ticketInstrumentSearching, setTicketInstrumentSearching] = useState(false);
  const [showTicketModalFromSolicitacao, setShowTicketModalFromSolicitacao] = useState(false);

  const [proponentes, setProponentes] = useState<Proponente[]>([]);
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
  const [ticketIdFromUrl, setTicketIdFromUrl] = useState<number | null>(() => readTicketIdFromSearch(window.location.search));
  const [ticketForm, setTicketForm] = useState<TicketForm>(() => emptyTicketForm());
  const [ticketResolutionReason, setTicketResolutionReason] = useState("");
  const [ticketCommentText, setTicketCommentText] = useState("");
  const [showTicketCreateModal, setShowTicketCreateModal] = useState(false);
  const [ticketAssignableUsers, setTicketAssignableUsers] = useState<Array<{ id: number; nome: string; email: string; role: Role }>>([]);
  const [assistentePergunta, setAssistentePergunta] = useState("");
  const [assistenteConversa, setAssistenteConversa] = useState<AssistenteChatItem[]>(() => emptyAssistenteConversa());
  const [isConsultandoAssistente, setIsConsultandoAssistente] = useState(false);
  const [relatorioTab, setRelatorioTab] = useState<RelatorioTab>("repasses");
  const [reportFilters, setReportFilters] = useState<ReportFilters>(() => emptyReportFilters());
  const [reportData, setReportData] = useState<RepasseReportResponse | null>(null);
  const [obraReportFilters, setObraReportFilters] = useState<ObraReportFilters>(() => emptyObraReportFilters());
  const [obraReportData, setObraReportData] = useState<ObraReportResponse | null>(null);
  const [transferenciasEspeciaisFilters, setTransferenciasEspeciaisFilters] = useState<TransferenciasEspeciaisFilters>(() =>
    emptyTransferenciasEspeciaisFilters()
  );
  const [transferenciasEspeciaisData, setTransferenciasEspeciaisData] =
    useState<TransferenciaEspecialPlanoAcaoResponse | null>(null);
  const [transferenciasEspeciaisPage, setTransferenciasEspeciaisPage] = useState(1);
  const [transferenciasDiscricionariasFilters, setTransferenciasDiscricionariasFilters] =
    useState<TransferenciasDiscricionariasFilters>(() => emptyTransferenciasDiscricionariasFilters());
  const [transferenciasDiscricionariasData, setTransferenciasDiscricionariasData] =
    useState<TransferenciaDiscricionariaResponse | null>(null);
  const [transferenciasDiscricionariasFiltros, setTransferenciasDiscricionariasFiltros] =
    useState<TransferenciaDiscricionariaFiltrosResponse | null>(null);
  const [transferenciasDiscricionariasCnpjSugestoes, setTransferenciasDiscricionariasCnpjSugestoes] =
    useState<TransferenciaDiscricionariaProponenteSugestaoItem[]>([]);
  const [transferenciasDiscricionariasSyncState, setTransferenciasDiscricionariasSyncState] =
    useState<TransferenciaDiscricionariaResponse["sincronizacao"] | null>(null);
  const [transferenciasDiscricionariasPage, setTransferenciasDiscricionariasPage] = useState(1);
  const [transferenciasDiscricionariasTab, setTransferenciasDiscricionariasTab] =
    useState<TransferenciasDiscricionariasTab>("convenios");
  const [transferenciasDiscricionariasDesembolsoFilters, setTransferenciasDiscricionariasDesembolsoFilters] =
    useState<TransferenciasDiscricionariasDesembolsoFilters>(() => emptyTransferenciasDiscricionariasDesembolsoFilters());
  const [transferenciasDiscricionariasDesembolsoData, setTransferenciasDiscricionariasDesembolsoData] =
    useState<TransferenciaDiscricionariaDesembolsoResponse | null>(null);
  const [transferenciasDiscricionariasDesembolsoPage, setTransferenciasDiscricionariasDesembolsoPage] = useState(1);
  const [isLoadingTransferenciasDiscricionariasDesembolsos, setIsLoadingTransferenciasDiscricionariasDesembolsos] = useState(false);
  const [transferenciasDiscricionariasProponenteDesembolsoFilters, setTransferenciasDiscricionariasProponenteDesembolsoFilters] =
    useState<TransferenciasDiscricionariasProponenteDesembolsoFilters>(() =>
      emptyTransferenciasDiscricionariasProponenteDesembolsoFilters()
    );
  const [transferenciasDiscricionariasProponenteDesembolsoData, setTransferenciasDiscricionariasProponenteDesembolsoData] =
    useState<TransferenciaDiscricionariaDesembolsoProponenteResponse | null>(null);
  const [transferenciasDiscricionariasProponenteDesembolsoPage, setTransferenciasDiscricionariasProponenteDesembolsoPage] =
    useState(1);
  const [isLoadingTransferenciasDiscricionariasProponenteDesembolsos, setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos] =
    useState(false);
  const [isSyncingTransferenciasDiscricionarias, setIsSyncingTransferenciasDiscricionarias] = useState(false);
  const [fnsRepassesFilters, setFnsRepassesFilters] = useState<FnsRepassesFilters>(() => emptyFnsRepassesFilters());
  const [fnsUfs, setFnsUfs] = useState<FnsUfItem[]>([]);
  const [fnsMunicipios, setFnsMunicipios] = useState<FnsMunicipioItem[]>([]);
  const [fnsEntidades, setFnsEntidades] = useState<FnsEntidadeItem[]>([]);
  const [fnsRepassesData, setFnsRepassesData] = useState<FnsRepassesResponse | null>(null);
  const [fnsRepassesDetalheData, setFnsRepassesDetalheData] = useState<FnsRepassesDetalheResponse | null>(null);
  const [fnsSaldosData, setFnsSaldosData] = useState<FnsSaldosTiposContaResponse | null>(null);
  const [fnsSyncStatus, setFnsSyncStatus] = useState<FnsSyncStatus | null>(null);
  const [fnsDetalheBlocoLabel, setFnsDetalheBlocoLabel] = useState<string>("");
  const [consultaFnsFilters, setConsultaFnsFilters] = useState<ConsultaFnsFilters>(() => emptyConsultaFnsFilters());
  const [consultaFnsUfs, setConsultaFnsUfs] = useState<ConsultaFnsUfItem[]>([]);
  const [consultaFnsAnos, setConsultaFnsAnos] = useState<ConsultaFnsAnoItem[]>([]);
  const [consultaFnsMunicipios, setConsultaFnsMunicipios] = useState<ConsultaFnsMunicipioItem[]>([]);
  const [consultaFnsData, setConsultaFnsData] = useState<ConsultaFnsPropostasResponse | null>(null);
  const [consultaFnsPage, setConsultaFnsPage] = useState(1);
  const [consultaFnsSelected, setConsultaFnsSelected] = useState<ConsultaFnsPropostaItem | null>(null);
  const [consultaFnsDetalhe, setConsultaFnsDetalhe] = useState<ConsultaFnsPropostaDetalhe | null>(null);
  const [consultaFnsSyncStatus, setConsultaFnsSyncStatus] = useState<ConsultaFnsSyncStatus | null>(null);
  const [simecObrasFilters, setSimecObrasFilters] = useState<SimecObrasFilters>(() => emptySimecObrasFilters());
  const [simecUfs, setSimecUfs] = useState<SimecUfItem[]>([]);
  const [simecMunicipios, setSimecMunicipios] = useState<SimecMunicipioItem[]>([]);
  const [simecObrasData, setSimecObrasData] = useState<SimecObrasResponse | null>(null);
  const [simecObraDetalhe, setSimecObraDetalhe] = useState<SimecObraDetalhe | null>(null);
  const [simecObraDetalheId, setSimecObraDetalheId] = useState<number | null>(null);
  const [ticketReportFilters, setTicketReportFilters] = useState<TicketReportFilters>(() => emptyTicketReportFilters());
  const [ticketReportData, setTicketReportData] = useState<Ticket[] | null>(null);
  const [proponenteCadastro, setProponenteCadastro] = useState<ProponenteCadastroState>(() =>
    emptyProponenteCadastroState()
  );
  const [proponenteSugestoes, setProponenteSugestoes] = useState<ProponenteSugestaoItem[]>([]);
  const [isLoadingProponenteSugestoes, setIsLoadingProponenteSugestoes] = useState(false);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [adminUserForm, setAdminUserForm] = useState<AdminUserForm>(() => emptyAdminUserForm());
  const [editingManagedUserId, setEditingManagedUserId] = useState<number | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [signatureTab, setSignatureTab] = useState<SignatureTab>("documentos");
  const [certificates, setCertificates] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [documentSearchQuery, setDocumentSearchQuery] = useState("");
  const [documentSearchStatus, setDocumentSearchStatus] = useState<"" | "PENDENTE" | "ASSINADO" | "CANCELADO">("");
  const [documentSearchDataDe, setDocumentSearchDataDe] = useState("");
  const [documentSearchDataAte, setDocumentSearchDataAte] = useState("");
  const [documentSearchSemantic, setDocumentSearchSemantic] = useState(true);
  const [documentSearchResults, setDocumentSearchResults] = useState<DocumentSearchResult[]>([]);
  const [isSearchingDocuments, setIsSearchingDocuments] = useState(false);
  const [reindexingDocumentId, setReindexingDocumentId] = useState<number | null>(null);
  const [classifyingDocumentId, setClassifyingDocumentId] = useState<number | null>(null);
  const [qaDocumentId, setQaDocumentId] = useState<number | null>(null);
  const [qaDocumentTitle, setQaDocumentTitle] = useState("");
  const [qaQuestion, setQaQuestion] = useState("");
  const [qaAnswer, setQaAnswer] = useState("");
  const [qaSources, setQaSources] = useState<Array<{ chunkIndex: number; score: number; snippet: string }>>([]);
  const [isAskingDocument, setIsAskingDocument] = useState(false);
  const [documentAiRequests, setDocumentAiRequests] = useState<DocumentAiRequestItem[]>([]);
  const [isLoadingDocumentAiRequests, setIsLoadingDocumentAiRequests] = useState(false);
  const [busyDocumentAiRequestId, setBusyDocumentAiRequestId] = useState<number | null>(null);
  const [documentAiRequestFilterStatus, setDocumentAiRequestFilterStatus] = useState<"" | DocumentAiRequestStatus>("");
  const [documentAiRequestFilterPriority, setDocumentAiRequestFilterPriority] = useState<"" | DocumentAiRequestPriority>("");
  const [documentAiRequestFilterQuery, setDocumentAiRequestFilterQuery] = useState("");
  const [documentAiRequestForm, setDocumentAiRequestForm] = useState<{
    titulo: string;
    descricao: string;
    prioridade: DocumentAiRequestPriority;
    prazo: string;
    validadeDias: number;
  }>({
    titulo: "",
    descricao: "",
    prioridade: "MEDIA",
    prazo: "",
    validadeDias: 7
  });
  const [certificateForm, setCertificateForm] = useState({ nome: "", titular: "", cpf: "", validade: "", arquivo: "", senha: "" });
  const [documentForm, setDocumentForm] = useState<{ titulo: string; descricao: string; arquivo: File | null; arquivo_nome: string }>({
    titulo: "",
    descricao: "",
    arquivo: null,
    arquivo_nome: ""
  });
  const [showSignModal, setShowSignModal] = useState(false);
  const [signDocumentId, setSignDocumentId] = useState<number | null>(null);
  const [signCertificateId, setSignCertificateId] = useState<number | null>(null);
  const [signPassword, setSignPassword] = useState("");
  const [activeCertificates, setActiveCertificates] = useState<any[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [deletingDocumentId, setDeletingDocumentId] = useState<number | null>(null);
  const documentUploadInputRef = useRef<HTMLInputElement | null>(null);

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
  const proponenteNameById = useMemo(() => {
    return new Map(proponentes.map((item) => [item.id, item.nome]));
  }, [proponentes]);
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
  const allowChecklistExternalLink = currentFlowType !== "OBRA";
  const isEditingProfileInstrument = Boolean(
    canManageInstruments && isInstrumentProfileView && profileInstrument && editingId === profileInstrument.id
  );
  const stageLabels = getStageLabels(currentFlowType);
  const repassePercentualAtual = profileInstrument
    ? calculateRepassePercentage(profileInstrument.valor_ja_repassado, profileInstrument.valor_repasse)
    : 0;
  const profileInstrumentRepasses = profileInstrument?.repasses ?? [];
  const reportInstrumentOptions = useMemo(() => {
    if (reportFilters.proponente_id.trim() === "") {
      return [];
    }

    const proponenteId = Number(reportFilters.proponente_id);
    return sortedInstruments.filter((item) => (item.proponente_id ?? item.convenete_id) === proponenteId);
  }, [reportFilters.proponente_id, sortedInstruments]);
  const obraReportInstrumentOptions = useMemo(() => {
    const obraItems = sortedInstruments.filter((item) => item.fluxo_tipo === "OBRA");
    if (obraReportFilters.proponente_id.trim() === "") {
      return obraItems;
    }

    const proponenteId = Number(obraReportFilters.proponente_id);
    return obraItems.filter((item) => (item.proponente_id ?? item.convenete_id) === proponenteId);
  }, [obraReportFilters.proponente_id, sortedInstruments]);
  const filteredSimecObrasItems = useMemo(() => {
    if (!simecObrasData) {
      return [] as SimecObrasResponse["itens"];
    }

    const vigenciaStatus = simecObrasFilters.vigencia_status;
    if (vigenciaStatus === "") {
      return simecObrasData.itens;
    }

    return simecObrasData.itens.filter((item) => {
      if (!item.vigencia_fim) {
        return false;
      }

      const diasParaVencimento = getDaysUntilDate(item.vigencia_fim);
      if (diasParaVencimento === null) {
        return false;
      }

      if (vigenciaStatus === "vencidas") {
        return diasParaVencimento < 0;
      }

      const limiteDias = Number(vigenciaStatus);
      return Number.isFinite(limiteDias) && diasParaVencimento >= 0 && diasParaVencimento <= limiteDias;
    });
  }, [simecObrasData, simecObrasFilters.vigencia_status]);

  const overviewItemsAtendidos = useMemo(() => {
    const proponenteIds = new Set(proponentes.map((item) => item.id));
    if (proponenteIds.size === 0) {
      return [] as Instrument[];
    }
    return overviewItems.filter((item) => {
      const proponenteId = item.proponente_id ?? item.convenete_id;
      return proponenteId !== null && proponenteId !== undefined && proponenteIds.has(proponenteId);
    });
  }, [overviewItems, proponentes]);

  const alertsAtendidos = useMemo(() => {
    const instrumentoIds = new Set(overviewItemsAtendidos.map((item) => item.id));
    return alerts.filter((item) => instrumentoIds.has(item.instrumento_id));
  }, [alerts, overviewItemsAtendidos]);

  const dashboard = useMemo(() => {
    const totalRegistros = overviewItemsAtendidos.length;
    const ativos = overviewItemsAtendidos.filter((item) => item.ativo).length;
    const valorTotal = overviewItemsAtendidos.reduce((acc, item) => acc + item.valor_total, 0);
    const porStatus = STATUS_OPTIONS.map((status) => ({
      status,
      quantidade: overviewItemsAtendidos.filter((item) => item.status === status).length
    }));

    return {
      totalRegistros,
      ativos,
      inativos: totalRegistros - ativos,
      valorTotal,
      alertas: alertsAtendidos.length,
      porStatus
    };
  }, [overviewItemsAtendidos, alertsAtendidos]);

  const dashboardInsights = useMemo(() => {
    const totalRepassado = overviewItemsAtendidos.reduce((acc, item) => acc + item.valor_ja_repassado, 0);
    const percentualMedioRepassado =
      overviewItemsAtendidos.length > 0
        ? overviewItemsAtendidos.reduce((acc, item) => acc + item.percentual_repassado, 0) / overviewItemsAtendidos.length
        : 0;

    const flowTypes: InstrumentFlowType[] = [
      "OBRA",
      "AQUISICAO_EQUIPAMENTOS",
      "EVENTOS"
    ];
    const porFluxo: Array<{ fluxo: InstrumentFlowType; quantidade: number }> = flowTypes.map((fluxo) => ({
      fluxo,
      quantidade: overviewItemsAtendidos.filter((item) => item.fluxo_tipo === fluxo).length
    }));

    const concedenteMap = new Map<string, number>();
    for (const item of overviewItemsAtendidos) {
      const key = item.concedente.trim();
      concedenteMap.set(key, (concedenteMap.get(key) ?? 0) + 1);
    }
    const topConcedentes = Array.from(concedenteMap.entries())
      .map(([concedente, quantidade]) => ({ concedente, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    const alertasCriticos = [...alertsAtendidos]
      .sort((a, b) => {
        const aMin = Math.min(a.dias_para_vigencia_fim, a.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
        const bMin = Math.min(b.dias_para_vigencia_fim, b.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
        return aMin - bMin;
      })
      .slice(0, 5);

    const obrasAtivas = overviewItemsAtendidos.filter((item) => item.fluxo_tipo === "OBRA" && item.ativo);
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
      prestacaoPendente: overviewItemsAtendidos.filter((item) => item.status === "PRESTACAO_PENDENTE").length,
      emExecucao: overviewItemsAtendidos.filter((item) => item.status === "EM_EXECUCAO").length,
      vencidos: overviewItemsAtendidos.filter((item) => item.status === "VENCIDO").length,
      usuarios: managedUsers.length,
      logs: auditLogs.length
    };
  }, [overviewItemsAtendidos, alertsAtendidos, managedUsers, auditLogs]);

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

  const ticketReportSummary = useMemo(() => {
    const items = ticketReportData ?? [];
    const total = items.length;
    const abertos = items.filter((item) => item.status === "ABERTO" || item.status === "EM_ANDAMENTO").length;
    const resolvidos = items.filter((item) => item.status === "RESOLVIDO").length;
    const cancelados = items.filter((item) => item.status === "CANCELADO").length;
    const atrasados = items.filter((item) => isTicketOverdue(item)).length;
    const semAtribuicao = items.filter((item) => !item.responsavel).length;

    const tempoResolucaoDias = items
      .filter((item) => item.resolvido_em)
      .map((item) => {
        const started = new Date(item.created_at).getTime();
        const resolved = new Date(item.resolvido_em as string).getTime();
        return Math.max(0, (resolved - started) / (1000 * 60 * 60 * 24));
      });

    const tempoMedioResolucaoDias =
      tempoResolucaoDias.length === 0
        ? 0
        : tempoResolucaoDias.reduce((acc, value) => acc + value, 0) / tempoResolucaoDias.length;

    const porPrioridade = TICKET_PRIORITY_OPTIONS.map((priority) => ({
      prioridade: priority,
      quantidade: items.filter((item) => item.prioridade === priority).length
    }));

    const porStatus = TICKET_STATUS_OPTIONS.map((status) => ({
      status,
      quantidade: items.filter((item) => item.status === status).length
    }));

    const porResponsavel = new Map<string, number>();
    for (const item of items) {
      const key = item.responsavel?.nome ?? "Nao atribuido";
      porResponsavel.set(key, (porResponsavel.get(key) ?? 0) + 1);
    }
    const topResponsaveis = Array.from(porResponsavel.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 6);

    return {
      total,
      abertos,
      resolvidos,
      cancelados,
      atrasados,
      semAtribuicao,
      tempoMedioResolucaoDias,
      porPrioridade,
      porStatus,
      topResponsaveis
    };
  }, [ticketReportData]);

  const transferenciasDiscricionariasSyncInfo =
    transferenciasDiscricionariasSyncState ?? transferenciasDiscricionariasData?.sincronizacao ?? null;
  const transferenciasDiscricionariasProponenteParcelaMap = useMemo(
    () =>
      transferenciasDiscricionariasProponenteDesembolsoData
        ? buildDesembolsoParcelaMap(transferenciasDiscricionariasProponenteDesembolsoData.itens)
        : new Map<number, number>(),
    [transferenciasDiscricionariasProponenteDesembolsoData]
  );

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
      const smokeResponse = await fetch("/api/v1/relatorios/obras?ativo=true", {
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
    setRelatorioTab("repasses");
    setReportFilters(emptyReportFilters());
    setReportData(null);
    setObraReportFilters(emptyObraReportFilters());
    setObraReportData(null);
    setTransferenciasEspeciaisFilters(emptyTransferenciasEspeciaisFilters());
    setTransferenciasEspeciaisData(null);
    setTransferenciasEspeciaisPage(1);
    setTransferenciasDiscricionariasFilters(emptyTransferenciasDiscricionariasFilters());
    setTransferenciasDiscricionariasData(null);
    setTransferenciasDiscricionariasFiltros(null);
    setTransferenciasDiscricionariasCnpjSugestoes([]);
    setTransferenciasDiscricionariasSyncState(null);
    setTransferenciasDiscricionariasPage(1);
    setTransferenciasDiscricionariasTab("convenios");
    setTransferenciasDiscricionariasDesembolsoFilters(emptyTransferenciasDiscricionariasDesembolsoFilters());
    setTransferenciasDiscricionariasDesembolsoData(null);
    setTransferenciasDiscricionariasDesembolsoPage(1);
    setTransferenciasDiscricionariasProponenteDesembolsoFilters(
      emptyTransferenciasDiscricionariasProponenteDesembolsoFilters()
    );
    setTransferenciasDiscricionariasProponenteDesembolsoData(null);
    setTransferenciasDiscricionariasProponenteDesembolsoPage(1);
    setFnsRepassesFilters(emptyFnsRepassesFilters());
    setFnsUfs([]);
    setFnsMunicipios([]);
    setFnsEntidades([]);
    setFnsRepassesData(null);
    setFnsRepassesDetalheData(null);
    setFnsSaldosData(null);
    setFnsSyncStatus(null);
    setFnsDetalheBlocoLabel("");
    setConsultaFnsFilters(emptyConsultaFnsFilters());
    setConsultaFnsUfs([]);
    setConsultaFnsAnos([]);
    setConsultaFnsMunicipios([]);
    setConsultaFnsData(null);
    setConsultaFnsPage(1);
    setConsultaFnsSelected(null);
    setConsultaFnsDetalhe(null);
    setConsultaFnsSyncStatus(null);
    setSimecObrasFilters(emptySimecObrasFilters());
    setSimecUfs([]);
    setSimecMunicipios([]);
    setSimecObrasData(null);
    setSimecObraDetalhe(null);
    setSimecObraDetalheId(null);
    setTicketReportFilters(emptyTicketReportFilters());
    setTicketReportData(null);
    setTicketFilters(emptyTicketFilters());
    setTickets([]);
    setTicketBoardTab("abertos");
    setSelectedTicket(null);
    setTicketIdFromUrl(null);
    setTicketForm(emptyTicketForm());
    setTicketResolutionReason("");
    setTicketCommentText("");
    setTicketAssignableUsers([]);
    setAssistentePergunta("");
    setAssistenteConversa(emptyAssistenteConversa());
    setIsConsultandoAssistente(false);
    setEditingId(null);
    setShowCreateInstrumentForm(false);
    setForm(emptyInstrumentForm());
    setProponentes([]);
    setProponenteCadastro(emptyProponenteCadastroState());
    setProponenteSugestoes([]);
    setManagedUsers([]);
    setEditingManagedUserId(null);
    setAdminUserForm(emptyAdminUserForm());
    setFilters(blankFilters());
    setInstrumentPageId(null);
    if (window.location.pathname !== "/" || window.location.search !== "") {
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
    return () => {
      if (menuTransitionTimeoutRef.current !== null) {
        window.clearTimeout(menuTransitionTimeoutRef.current);
      }
      if (assistenteTypingIntervalRef.current !== null) {
        window.clearInterval(assistenteTypingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!assistenteChatLogRef.current) {
      return;
    }
    assistenteChatLogRef.current.scrollTo({
      top: assistenteChatLogRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [assistenteConversa, isConsultandoAssistente]);

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

  useEffect(() => {
    if (!isAuthenticated || !token || ticketIdFromUrl === null) {
      return;
    }

    if (selectedTicket?.id === ticketIdFromUrl) {
      return;
    }

    setActiveView("tickets");
    void onSelectTicket(ticketIdFromUrl, false);
  }, [isAuthenticated, token, ticketIdFromUrl]);

  useEffect(() => {
    if (activeView !== "tickets" || window.location.pathname !== "/") {
      return;
    }

    const currentUrl = `${window.location.pathname}${window.location.search}`;
    const nextUrl = selectedTicket ? `/?ticket=${selectedTicket.id}` : "/";
    if (currentUrl !== nextUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
  }, [activeView, selectedTicket]);

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

  const loadProponentes = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const items = await listProponentes(currentToken);
    setProponentes(items);
  };

  const loadRepasseReport = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    if (reportFilters.proponente_id.trim() === "") {
      setReportData(null);
      return;
    }

    const report = await getRepasseReport(currentToken, {
      proponente_id: Number(reportFilters.proponente_id),
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
      proponente_id: obraReportFilters.proponente_id.trim() === "" ? undefined : Number(obraReportFilters.proponente_id),
      instrumento_id: obraReportFilters.instrumento_id.trim() === "" ? undefined : Number(obraReportFilters.instrumento_id),
      status: obraReportFilters.status || undefined,
      ativo: obraReportFilters.ativo === "true",
      data_de: obraReportFilters.data_de || undefined,
      data_ate: obraReportFilters.data_ate || undefined
    });

    setObraReportData(report);
  };

  const loadTransferenciasEspeciaisReport = async (pageOverride?: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const pageSizeParsed = Number(transferenciasEspeciaisFilters.page_size);
    const report = await getTransferenciasEspeciaisPlanoAcao(currentToken, {
      cnpj: transferenciasEspeciaisFilters.cnpj.trim() || undefined,
      nome_beneficiario: transferenciasEspeciaisFilters.nome_beneficiario.trim() || undefined,
      uf: transferenciasEspeciaisFilters.uf.trim().toUpperCase() || undefined,
      ano: transferenciasEspeciaisFilters.ano.trim() === "" ? undefined : Number(transferenciasEspeciaisFilters.ano),
      situacao: transferenciasEspeciaisFilters.situacao.trim() || undefined,
      codigo_plano_acao: transferenciasEspeciaisFilters.codigo_plano_acao.trim() || undefined,
      parlamentar: transferenciasEspeciaisFilters.parlamentar.trim() || undefined,
      page: pageOverride ?? transferenciasEspeciaisPage,
      page_size: Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 ? pageSizeParsed : 20
    });

    setTransferenciasEspeciaisData(report);
    setTransferenciasEspeciaisPage(report.paginacao.pagina);
  };

  const buildTransferenciasDiscricionariasQuery = (
    page: number,
    pageSize: number,
    filters: TransferenciasDiscricionariasFilters
  ) => {
    const vigenciaDiasParsed = Number(filters.vigencia_a_vencer_dias);
    const vigenciaDias = [30, 60, 90].includes(vigenciaDiasParsed)
      ? (vigenciaDiasParsed as 30 | 60 | 90)
      : undefined;

    return {
      cnpj: filters.cnpj.trim() || undefined,
      nome_proponente: filters.nome_proponente.trim() || undefined,
      uf: filters.uf.trim().toUpperCase() || undefined,
      municipio: filters.municipio.trim() || undefined,
      ano: filters.ano.trim() === "" ? undefined : Number(filters.ano),
      situacao_proposta: filters.situacao_proposta.trim() || undefined,
      situacao_convenio: filters.situacao_convenio.trim() || undefined,
      nr_convenio: filters.nr_convenio.trim() || undefined,
      nr_proposta: filters.nr_proposta.trim() || undefined,
      tipo_ente: filters.tipo_ente || undefined,
      vigencia_a_vencer_dias: vigenciaDias,
      page,
      page_size: pageSize
    };
  };

  const loadTransferenciasDiscricionariasReport = async (
    pageOverride?: number,
    authToken?: string,
    filtersOverride?: Partial<TransferenciasDiscricionariasFilters>
  ) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const sourceFilters = filtersOverride
      ? { ...transferenciasDiscricionariasFilters, ...filtersOverride }
      : transferenciasDiscricionariasFilters;

    const pageSizeParsed = Number(sourceFilters.page_size);
    const effectivePageSize = Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 ? pageSizeParsed : 20;
    const report = await getTransferenciasDiscricionarias(
      currentToken,
      buildTransferenciasDiscricionariasQuery(pageOverride ?? transferenciasDiscricionariasPage, effectivePageSize, sourceFilters)
    );

    setTransferenciasDiscricionariasData(report);
    setTransferenciasDiscricionariasSyncState(report.sincronizacao);
    setTransferenciasDiscricionariasPage(report.paginacao.pagina);
  };

  const loadTransferenciasDiscricionariasFiltros = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const filtros = await getTransferenciasDiscricionariasFiltros(currentToken);
    setTransferenciasDiscricionariasFiltros(filtros);
  };

  const loadTransferenciasDiscricionariasCnpjSugestoes = async (cnpjParcial: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const digits = cnpjParcial.replace(/\D/g, "");
    if (digits.length < 4) {
      setTransferenciasDiscricionariasCnpjSugestoes([]);
      return;
    }

    const result = await getTransferenciasDiscricionariasProponenteSugestoes(currentToken, {
      cnpj: digits,
      limit: 10
    });
    setTransferenciasDiscricionariasCnpjSugestoes(result.itens);
  };

  const loadTransferenciasDiscricionariasDesembolsos = async (pageOverride?: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const nrConvenio = transferenciasDiscricionariasDesembolsoFilters.nr_convenio.trim();
    if (nrConvenio === "") {
      setTransferenciasDiscricionariasDesembolsoData(null);
      return;
    }

    const pageSizeParsed = Number(transferenciasDiscricionariasDesembolsoFilters.page_size);
    const anoParsed = Number(transferenciasDiscricionariasDesembolsoFilters.ano);
    const mesParsed = Number(transferenciasDiscricionariasDesembolsoFilters.mes);

    const report = await getTransferenciasDiscricionariasDesembolsos(currentToken, {
      nr_convenio: nrConvenio,
      ano: Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined,
      mes: Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined,
      page: pageOverride ?? transferenciasDiscricionariasDesembolsoPage,
      page_size: Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 ? pageSizeParsed : 50
    });

    setTransferenciasDiscricionariasDesembolsoData(report);
    setTransferenciasDiscricionariasDesembolsoPage(report.paginacao.pagina);
  };

  const loadTransferenciasDiscricionariasDesembolsosPorProponente = async (pageOverride?: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const cnpjDigits = transferenciasDiscricionariasProponenteDesembolsoFilters.cnpj.replace(/\D/g, "");
    const nomeProponente = transferenciasDiscricionariasProponenteDesembolsoFilters.nome_proponente.trim();

    if (cnpjDigits === "" && nomeProponente === "") {
      setTransferenciasDiscricionariasProponenteDesembolsoData(null);
      return;
    }

    const pageSizeParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.page_size);
    const anoParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.ano);
    const mesParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.mes);

    const report = await getTransferenciasDiscricionariasDesembolsosPorProponente(currentToken, {
      cnpj: cnpjDigits || undefined,
      nome_proponente: nomeProponente || undefined,
      ano: Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined,
      mes: Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined,
      page: pageOverride ?? transferenciasDiscricionariasProponenteDesembolsoPage,
      page_size: Number.isFinite(pageSizeParsed) && pageSizeParsed > 0 ? pageSizeParsed : 100
    });

    setTransferenciasDiscricionariasProponenteDesembolsoData(report);
    setTransferenciasDiscricionariasProponenteDesembolsoPage(report.paginacao.pagina);
  };

  const loadFnsSyncStatus = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const status = await getFnsSyncStatus(currentToken);
    setFnsSyncStatus(status);
  };

  const loadFnsUfs = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const result = await getFnsUfs(currentToken);
    setFnsUfs(result.itens);
  };

  const loadFnsMunicipios = async (ufId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const result = await getFnsMunicipios(currentToken, { uf_id: ufId });
    setFnsMunicipios(result.itens);
  };

  const loadFnsEntidades = async (coIbgeMunicipio: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const result = await getFnsEntidades(currentToken, { co_ibge_municipio: coIbgeMunicipio });
    setFnsEntidades(result.itens);
  };

  const loadFnsRepasses = async (authToken?: string, override?: Partial<FnsRepassesFilters>) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const source = override ? { ...fnsRepassesFilters, ...override } : fnsRepassesFilters;
    const cnpjDigits = source.cnpj.replace(/\D/g, "");
    const ano = Number(source.ano);
    if (cnpjDigits.length < 11) {
      setFnsRepassesData(null);
      setFnsRepassesDetalheData(null);
      setFnsSaldosData(null);
      return;
    }

    const repasses = await getFnsRepasses(currentToken, {
      cnpj: cnpjDigits,
      ano: Number.isFinite(ano) ? ano : undefined
    });
    setFnsRepassesData(repasses);

    const saldos = await getFnsSaldosTiposConta(currentToken, { cnpj: cnpjDigits });
    setFnsSaldosData(saldos);

    const codigoBloco = source.codigo_bloco.trim();
    if (codigoBloco !== "") {
      const detalhe = await getFnsRepassesDetalhe(currentToken, {
        cnpj: cnpjDigits,
        ano: Number.isFinite(ano) ? ano : undefined,
        codigo_bloco: codigoBloco
      });
      setFnsRepassesDetalheData(detalhe);
      setFnsDetalheBlocoLabel(codigoBloco);
    } else {
      setFnsRepassesDetalheData(null);
      setFnsDetalheBlocoLabel("");
    }
  };

  const loadFnsRepassesDetalheByBloco = async (codigoBloco: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const cnpjDigits = fnsRepassesFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length < 11) {
      throw new Error("Informe um CNPJ valido para consultar detalhe de repasses.");
    }

    const ano = Number(fnsRepassesFilters.ano);
    const detalhe = await getFnsRepassesDetalhe(currentToken, {
      cnpj: cnpjDigits,
      ano: Number.isFinite(ano) ? ano : undefined,
      codigo_bloco: codigoBloco
    });
    setFnsRepassesDetalheData(detalhe);
    setFnsDetalheBlocoLabel(codigoBloco);
    setFnsRepassesFilters((prev) => ({ ...prev, codigo_bloco: codigoBloco }));
  };

  const loadConsultaFnsStatus = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const status = await getConsultaFnsStatus(currentToken);
    setConsultaFnsSyncStatus(status);
  };

  const loadConsultaFnsCatalogos = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const [ufsRes, anosRes] = await Promise.all([getConsultaFnsUfs(currentToken), getConsultaFnsAnos(currentToken)]);
    setConsultaFnsUfs(ufsRes.itens);
    setConsultaFnsAnos(anosRes.itens);
  };

  const loadConsultaFnsMunicipios = async (uf: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const response = await getConsultaFnsMunicipios(currentToken, { uf });
    setConsultaFnsMunicipios(response.itens);
  };

  const loadConsultaFnsPropostas = async (pageOverride?: number, authToken?: string, override?: Partial<ConsultaFnsFilters>) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const source = override ? { ...consultaFnsFilters, ...override } : consultaFnsFilters;
    const ano = Number(source.ano);
    const count = Number(source.count);

    const result = await getConsultaFnsPropostas(currentToken, {
      ano: Number.isFinite(ano) ? ano : undefined,
      uf: source.uf || undefined,
      co_municipio_ibge: source.co_municipio_ibge || undefined,
      nu_proposta: source.nu_proposta.trim() || undefined,
      tp_proposta: source.tp_proposta.trim() || undefined,
      tp_recurso: source.tp_recurso.trim() || undefined,
      tp_emenda: source.tp_emenda.trim() || undefined,
      page: pageOverride ?? consultaFnsPage,
      count: Number.isFinite(count) && count > 0 ? count : 20
    });

    let enrichedItems = result.itens;
    const candidates = result.itens
      .map((item, index) => ({ item, index, nuProposta: resolveConsultaFnsNuProposta(item) }))
      .filter((entry) => entry.nuProposta !== "" && (entry.item.parlamentares?.length ?? 0) === 0)
      .slice(0, Number.isFinite(count) ? Math.min(Math.max(count, 1), 30) : 20);

    if (candidates.length > 0) {
      const details = await Promise.all(
        candidates.map(async (entry) => {
          try {
            const detalhe = await getConsultaFnsPropostaDetalhe(currentToken, entry.nuProposta);
            return {
              index: entry.index,
              parlamentares: detalhe.parlamentares
            };
          } catch {
            return {
              index: entry.index,
              parlamentares: [] as ConsultaFnsPropostaDetalhe["parlamentares"]
            };
          }
        })
      );

      enrichedItems = result.itens.map((item, index) => {
        const detail = details.find((entry) => entry.index === index);
        if (!detail || detail.parlamentares.length === 0) {
          return item;
        }
        return {
          ...item,
          parlamentares: detail.parlamentares
        };
      });
    }

    setConsultaFnsData({ ...result, itens: enrichedItems });
    setConsultaFnsPage(result.paginacao.pagina);
  };

  const loadConsultaFnsPropostaDetalhe = async (nuProposta: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const detalhe = await getConsultaFnsPropostaDetalhe(currentToken, nuProposta);
    setConsultaFnsDetalhe(detalhe);
  };

  const loadSimecUfs = async (authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    try {
      const result = await getSimecUfs(currentToken);
      setSimecUfs(result.itens.length > 0 ? result.itens : BRAZIL_UFS);
    } catch {
      setSimecUfs(BRAZIL_UFS);
    }
  };

  const loadSimecMunicipios = async (uf: string, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    try {
      const result = await getSimecMunicipios(currentToken, { uf });
      if (result.itens.length > 0) {
        setSimecMunicipios(result.itens);
        return;
      }
    } catch {
      // fallback handled below
    }

    try {
      const fallback = await loadIbgeMunicipiosByUf(uf);
      setSimecMunicipios(fallback);
    } catch {
      setSimecMunicipios([]);
    }
  };

  const loadSimecObras = async (authToken?: string, override?: Partial<SimecObrasFilters>) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const source = override ? { ...simecObrasFilters, ...override } : simecObrasFilters;
    const uf = source.uf.trim().toUpperCase();
    const muncod = source.muncod.trim();

    if (uf.length !== 2 || muncod.length < 6) {
      setSimecObrasData(null);
      return;
    }

    const result = await getSimecObras(currentToken, {
      uf,
      muncod,
      esfera: source.esfera.trim() || undefined,
      tipologia: source.tipologia.trim() || undefined,
      obrid: source.obrid.trim() || undefined
    });
    setSimecObrasData(result);
  };

  const loadSimecObraDetalhe = async (obraId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const result = await getSimecObraDetalhe(currentToken, obraId);
    setSimecObraDetalhe(result);
    setSimecObraDetalheId(obraId);
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
      const coreResults = await Promise.allSettled([
        loadInstruments(authToken),
        loadDashboard(authToken),
        loadAuditTrail(authToken),
        loadTickets(authToken)
      ]);

      const coreFailures = coreResults.filter((item) => item.status === "rejected");
      try {
        await loadProponentes(authToken);
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

      if (coreFailures.length === 0) {
        setMessage("Dados atualizados com sucesso.");
      } else {
        const firstError = coreFailures[0] as PromiseRejectedResult;
        const baseMessage =
          firstError.reason instanceof Error ? firstError.reason.message : "Falha parcial ao atualizar dados.";
        setMessage(`${baseMessage} (${coreFailures.length} modulo(s) com falha).`);
      }
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
      const ticketFromSearch = readTicketIdFromSearch(window.location.search);
      setInstrumentPageId(idFromPath);
      setTicketIdFromUrl(ticketFromSearch);
      if (idFromPath !== null) {
        setActiveView("instrumentos");
        return;
      }
      if (ticketFromSearch !== null) {
        setActiveView("tickets");
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
      setEmpresaVencedoraNomeInput("");
      setEmpresaVencedoraCnpjInput("");
      setEmpresaVencedoraValorInput(formatCurrencyInput(0));
      return;
    }

    setEmpresaVencedoraNomeInput(profileInstrument.empresa_vencedora ?? "");
    setEmpresaVencedoraCnpjInput(profileInstrument.cnpj_vencedora ?? "");
    setEmpresaVencedoraValorInput(formatCurrencyInput(profileInstrument.valor_vencedor ?? 0));
  }, [
    profileInstrument?.id,
    profileInstrument?.empresa_vencedora,
    profileInstrument?.cnpj_vencedora,
    profileInstrument?.valor_vencedor
  ]);

  useEffect(() => {
    if (!token || !showRepassePanel || !profileInstrument) {
      return;
    }

    withLoadedRepasses(token, profileInstrument)
      .then((updatedWithRepasses) => {
        setInstruments((prev) => prev.map((item) => (item.id === updatedWithRepasses.id ? updatedWithRepasses : item)));
        setSelectedInstrument(updatedWithRepasses);
      })
      .catch(() => undefined);
  }, [token, showRepassePanel, profileInstrument?.id]);

  useEffect(() => {
    setStageFollowUpText("");
    setStageFollowUpFiles([]);
    setStageFollowUpModalStage(null);
    setExpandedFollowUpIds([]);
  }, [activeWorkflowStage]);

  useEffect(() => {
    if (proponentes.length === 0) {
      return;
    }

    setReportFilters((prev) => {
      const selectedId = Number(prev.proponente_id);
      const hasSelected = Number.isInteger(selectedId) && proponentes.some((item) => item.id === selectedId);
      if (prev.proponente_id.trim() !== "" && hasSelected) {
        return prev;
      }
      return {
        ...prev,
        proponente_id: String(proponentes[0].id),
        instrumento_id: ""
      };
    });

    setObraReportFilters((prev) => {
      const selectedId = Number(prev.proponente_id);
      const hasSelected = Number.isInteger(selectedId) && proponentes.some((item) => item.id === selectedId);
      if (prev.proponente_id.trim() !== "" && hasSelected) {
        return prev;
      }
      return {
        ...prev,
        proponente_id: String(proponentes[0].id),
        instrumento_id: ""
      };
    });
  }, [proponentes]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "repasses") {
      return;
    }

    if (reportFilters.proponente_id.trim() === "" || reportData) {
      return;
    }

    void onApplyRepasseReportFilters();
  }, [activeView, isAuthenticated, relatorioTab, reportFilters.proponente_id, reportData]);

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
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "tickets") {
      return;
    }

    if (ticketReportData) {
      return;
    }

    void onApplyTicketReportFilters();
  }, [activeView, isAuthenticated, relatorioTab, ticketReportData]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "transferencias_especiais") {
      return;
    }

    if (transferenciasEspeciaisData) {
      return;
    }

    void onApplyTransferenciasEspeciaisFilters(1);
  }, [activeView, isAuthenticated, relatorioTab, transferenciasEspeciaisData]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "transferencias_discricionarias") {
      return;
    }

    if (transferenciasDiscricionariasData) {
      return;
    }

    void onApplyTransferenciasDiscricionariasFilters(1);
  }, [activeView, isAuthenticated, relatorioTab, transferenciasDiscricionariasData]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios") {
      return;
    }

    if (relatorioTab !== "transferencias_discricionarias") {
      return;
    }

    if (transferenciasDiscricionariasFiltros) {
      return;
    }

    void loadTransferenciasDiscricionariasFiltros();
  }, [activeView, isAuthenticated, relatorioTab, transferenciasDiscricionariasFiltros]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "fns_repasses") {
      return;
    }

    if (fnsUfs.length === 0) {
      void loadFnsUfs();
    }
    if (!fnsSyncStatus) {
      void loadFnsSyncStatus();
    }
  }, [activeView, isAuthenticated, relatorioTab, fnsUfs.length, fnsSyncStatus]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "fns_repasses") {
      return;
    }

    const ufId = Number(fnsRepassesFilters.uf_id);
    if (!Number.isFinite(ufId) || ufId < 11) {
      setFnsMunicipios([]);
      setFnsEntidades([]);
      return;
    }

    void loadFnsMunicipios(ufId);
  }, [activeView, isAuthenticated, relatorioTab, fnsRepassesFilters.uf_id]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "fns_repasses") {
      return;
    }

    const municipio = Number(fnsRepassesFilters.co_ibge_municipio);
    if (!Number.isFinite(municipio) || municipio < 100000) {
      setFnsEntidades([]);
      return;
    }

    void loadFnsEntidades(municipio);
  }, [activeView, isAuthenticated, relatorioTab, fnsRepassesFilters.co_ibge_municipio]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "consultafns_propostas") {
      return;
    }

    if (consultaFnsUfs.length === 0 || consultaFnsAnos.length === 0) {
      void loadConsultaFnsCatalogos();
    }
    if (!consultaFnsSyncStatus) {
      void loadConsultaFnsStatus();
    }
  }, [activeView, isAuthenticated, relatorioTab, consultaFnsUfs.length, consultaFnsAnos.length, consultaFnsSyncStatus]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "consultafns_propostas") {
      return;
    }

    const uf = consultaFnsFilters.uf.trim().toUpperCase();
    if (uf.length !== 2) {
      setConsultaFnsMunicipios([]);
      setConsultaFnsFilters((prev) => (prev.co_municipio_ibge === "" ? prev : { ...prev, co_municipio_ibge: "" }));
      return;
    }

    void loadConsultaFnsMunicipios(uf);
  }, [activeView, isAuthenticated, relatorioTab, consultaFnsFilters.uf]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "simec_obras") {
      return;
    }

    if (simecUfs.length === 0) {
      void loadSimecUfs();
    }
  }, [activeView, isAuthenticated, relatorioTab, simecUfs.length]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "simec_obras") {
      return;
    }

    const uf = simecObrasFilters.uf.trim().toUpperCase();
    if (uf.length !== 2) {
      setSimecMunicipios([]);
      setSimecObrasFilters((prev) => (prev.muncod === "" ? prev : { ...prev, muncod: "" }));
      return;
    }

    void loadSimecMunicipios(uf);
  }, [activeView, isAuthenticated, relatorioTab, simecObrasFilters.uf]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "relatorios" || relatorioTab !== "transferencias_discricionarias") {
      return;
    }

    const cnpjDigits = transferenciasDiscricionariasFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length < 4) {
      setTransferenciasDiscricionariasCnpjSugestoes([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void loadTransferenciasDiscricionariasCnpjSugestoes(cnpjDigits);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [
    activeView,
    isAuthenticated,
    relatorioTab,
    transferenciasDiscricionariasFilters.cnpj
  ]);

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

  useEffect(() => {
    if (!isAuthenticated || activeView !== "assinaturas") {
      return;
    }
    void onLoadCertificates();
    void onLoadDocuments();
    void onLoadDocumentAiRequests();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeView]);

  useEffect(() => {
    if (!isAuthenticated || activeView !== "assinaturas") {
      return;
    }
    if (signatureTab === "certificados") {
      void onLoadCertificates();
    } else {
      void onLoadDocuments();
      void onLoadDocumentAiRequests();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatureTab]);

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

  const onDeleteChecklistItem = async (itemId: number, nomeDocumento?: string) => {
    if (!token || instrumentPageId === null || !canManageInstruments) {
      return;
    }

    const alvo = nomeDocumento?.trim() ? `\"${nomeDocumento.trim()}\"` : "este item";
    if (!window.confirm(`Deseja realmente excluir ${alvo} do checklist?`)) {
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
    const transitionClass =
      activeView !== "tickets" && view === "tickets"
        ? "menu-to-tickets"
        : activeView === "tickets" && view !== "tickets"
          ? "menu-from-tickets"
          : "";

    setMenuTransition(transitionClass);
    if (menuTransitionTimeoutRef.current !== null) {
      window.clearTimeout(menuTransitionTimeoutRef.current);
      menuTransitionTimeoutRef.current = null;
    }
    if (transitionClass) {
      menuTransitionTimeoutRef.current = window.setTimeout(() => {
        setMenuTransition("");
        menuTransitionTimeoutRef.current = null;
      }, 520);
    }

    setActiveView(view);
    if (view === "instrumentos") {
      setShowCreateInstrumentForm(false);
      setEditingId(null);
      navigateToInstrumentList();
      return;
    }

    if (window.location.pathname !== "/" || window.location.search !== "") {
      window.history.pushState({}, "", "/");
    }
    setInstrumentPageId(null);
    setTicketIdFromUrl(null);
  };

  const appShellClassName = `${activeView === "tickets" ? "app-shell tickets-top-nav" : "app-shell"}${menuTransition ? ` ${menuTransition}` : ""}`;

  const onApplyRepasseReportFilters = async () => {
    if (reportFilters.proponente_id.trim() === "") {
      setMessage("Selecione um proponente para gerar o relatorio.");
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
      proponente_id: prev.proponente_id
    }));
    setReportData(null);
  };

  const onClearObraReportFilters = () => {
    setObraReportFilters((prev) => ({
      ...emptyObraReportFilters(),
      proponente_id: prev.proponente_id
    }));
    setObraReportData(null);
  };

  const onApplyTransferenciasEspeciaisFilters = async (nextPage = 1) => {
    setIsBusy(true);
    setMessage("");
    try {
      await loadTransferenciasEspeciaisReport(nextPage);
      setMessage("Relatorio de transferencias especiais atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar transferencias especiais.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearTransferenciasEspeciaisFilters = () => {
    setTransferenciasEspeciaisFilters(emptyTransferenciasEspeciaisFilters());
    setTransferenciasEspeciaisData(null);
    setTransferenciasEspeciaisPage(1);
  };

  const onApplyTransferenciasDiscricionariasFilters = async (nextPage = 1) => {
    setIsBusy(true);
    setMessage("");
    try {
      await loadTransferenciasDiscricionariasReport(nextPage);
      setMessage("Relatorio de transferencias discricionarias atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar transferencias discricionarias.");
    } finally {
      setIsBusy(false);
    }
  };

  const onApplyTransferenciasDiscricionariasVigenciaPreset = async (dias: 30 | 60 | 90) => {
    const nextFilters: TransferenciasDiscricionariasFilters = {
      ...transferenciasDiscricionariasFilters,
      vigencia_a_vencer_dias: String(dias) as "30" | "60" | "90"
    };

    setTransferenciasDiscricionariasFilters(nextFilters);
    setTransferenciasDiscricionariasTab("convenios");
    setIsBusy(true);
    setMessage("");
    try {
      await loadTransferenciasDiscricionariasReport(1, undefined, nextFilters);
      setMessage(`Relatorio de vigencias a vencer em ate ${dias} dias atualizado com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar vigencias a vencer.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearTransferenciasDiscricionariasFilters = () => {
    setTransferenciasDiscricionariasFilters(emptyTransferenciasDiscricionariasFilters());
    setTransferenciasDiscricionariasData(null);
    setTransferenciasDiscricionariasCnpjSugestoes([]);
    setTransferenciasDiscricionariasSyncState(null);
    setTransferenciasDiscricionariasPage(1);
    setTransferenciasDiscricionariasTab("convenios");
    setTransferenciasDiscricionariasDesembolsoFilters(emptyTransferenciasDiscricionariasDesembolsoFilters());
    setTransferenciasDiscricionariasDesembolsoData(null);
    setTransferenciasDiscricionariasDesembolsoPage(1);
    setTransferenciasDiscricionariasProponenteDesembolsoFilters(
      emptyTransferenciasDiscricionariasProponenteDesembolsoFilters()
    );
    setTransferenciasDiscricionariasProponenteDesembolsoData(null);
    setTransferenciasDiscricionariasProponenteDesembolsoPage(1);
  };

  const onOpenTransferenciasDiscricionariasDesembolsos = async (nrConvenio: string) => {
    const convenio = nrConvenio.trim();
    if (convenio === "") {
      return;
    }

    setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
      ...prev,
      nr_convenio: convenio
    }));
    setTransferenciasDiscricionariasDesembolsoPage(1);
    setIsLoadingTransferenciasDiscricionariasDesembolsos(true);
    setMessage("");
    try {
      await loadTransferenciasDiscricionariasDesembolsos(1);
      setMessage(`Historico de desembolsos do convenio ${convenio} carregado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar historico de desembolsos.");
    } finally {
      setIsLoadingTransferenciasDiscricionariasDesembolsos(false);
    }
  };

  const onApplyTransferenciasDiscricionariasDesembolsoFilters = async (nextPage = 1) => {
    setTransferenciasDiscricionariasDesembolsoPage(nextPage);
    setIsLoadingTransferenciasDiscricionariasDesembolsos(true);
    setMessage("");
    try {
      await loadTransferenciasDiscricionariasDesembolsos(nextPage);
      setMessage("Historico de desembolsos atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar historico de desembolsos.");
    } finally {
      setIsLoadingTransferenciasDiscricionariasDesembolsos(false);
    }
  };

  const onClearTransferenciasDiscricionariasDesembolsos = () => {
    setTransferenciasDiscricionariasDesembolsoFilters(emptyTransferenciasDiscricionariasDesembolsoFilters());
    setTransferenciasDiscricionariasDesembolsoData(null);
    setTransferenciasDiscricionariasDesembolsoPage(1);
  };

  const onApplyTransferenciasDiscricionariasProponenteDesembolsoFilters = async (nextPage = 1) => {
    setTransferenciasDiscricionariasProponenteDesembolsoPage(nextPage);
    setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos(true);
    setMessage("");
    try {
      await loadTransferenciasDiscricionariasDesembolsosPorProponente(nextPage);
      setMessage("Relatorio de desembolsos por proponente atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar desembolsos por proponente.");
    } finally {
      setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos(false);
    }
  };

  const onClearTransferenciasDiscricionariasProponenteDesembolsos = () => {
    setTransferenciasDiscricionariasProponenteDesembolsoFilters(
      emptyTransferenciasDiscricionariasProponenteDesembolsoFilters()
    );
    setTransferenciasDiscricionariasProponenteDesembolsoData(null);
    setTransferenciasDiscricionariasProponenteDesembolsoPage(1);
  };

  const onExportTransferenciasDiscricionariasProponenteDesembolsosPdf = async (mode: ReportPdfMode) => {
    if (!token) {
      return;
    }

    const cnpjDigits = transferenciasDiscricionariasProponenteDesembolsoFilters.cnpj.replace(/\D/g, "");
    const nomeProponente = transferenciasDiscricionariasProponenteDesembolsoFilters.nome_proponente.trim();
    if (cnpjDigits === "" && nomeProponente === "") {
      setMessage("Informe CNPJ ou nome do proponente antes de exportar PDF.");
      return;
    }

    setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos(true);
    setMessage("");
    try {
      const anoParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.ano);
      const mesParsed = Number(transferenciasDiscricionariasProponenteDesembolsoFilters.mes);
      const firstPage = await getTransferenciasDiscricionariasDesembolsosPorProponente(token, {
        cnpj: cnpjDigits || undefined,
        nome_proponente: nomeProponente || undefined,
        ano: Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined,
        mes: Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined,
        page: 1,
        page_size: 500
      });

      const allItems = [...firstPage.itens];
      for (let page = 2; page <= firstPage.paginacao.total_paginas; page += 1) {
        const next = await getTransferenciasDiscricionariasDesembolsosPorProponente(token, {
          cnpj: cnpjDigits || undefined,
          nome_proponente: nomeProponente || undefined,
          ano: Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined,
          mes: Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined,
          page,
          page_size: 500
        });
        allItems.push(...next.itens);
      }

      const fullReport: TransferenciaDiscricionariaDesembolsoProponenteResponse = {
        ...firstPage,
        itens: allItems,
        paginacao: {
          ...firstPage.paginacao,
          pagina: 1,
          tamanho_pagina: allItems.length,
          total: allItems.length,
          total_paginas: 1,
          tem_anterior: false,
          tem_proxima: false
        }
      };

      exportTransferenciasDiscricionariasProponenteDesembolsosPdf(fullReport, mode);
      setMessage("PDF de desembolsos por proponente gerado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao exportar PDF de desembolsos por proponente.");
    } finally {
      setIsLoadingTransferenciasDiscricionariasProponenteDesembolsos(false);
    }
  };

  const onRefreshTransferenciasDiscricionariasSyncStatus = async () => {
    if (!token) {
      return;
    }

    setIsSyncingTransferenciasDiscricionarias(true);
    setMessage("");
    try {
      const status = await getTransferenciasDiscricionariasSyncStatus(token);
      setTransferenciasDiscricionariasSyncState(status);
      setTransferenciasDiscricionariasData((prev) => (prev ? { ...prev, sincronizacao: status } : prev));
      setMessage("Status da sincronizacao atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar status da sincronizacao.");
    } finally {
      setIsSyncingTransferenciasDiscricionarias(false);
    }
  };

  const onSyncTransferenciasDiscricionarias = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsSyncingTransferenciasDiscricionarias(true);
    setMessage("");
    try {
      const result = await syncTransferenciasDiscricionarias(token, true);
      const status = await getTransferenciasDiscricionariasSyncStatus(token);
      setTransferenciasDiscricionariasSyncState(status);
      setTransferenciasDiscricionariasData((prev) => (prev ? { ...prev, sincronizacao: status } : prev));
      await loadTransferenciasDiscricionariasReport(1);
      setMessage(
        result.skipped
          ? "Base de transferencias discricionarias ja estava atualizada."
          : `Sincronizacao concluida: ${result.total_registros} registros carregados.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar transferencias discricionarias.");
    } finally {
      setIsSyncingTransferenciasDiscricionarias(false);
    }
  };

  const onApplyFnsRepassesFilters = async () => {
    if (!token) {
      return;
    }

    const cnpjDigits = fnsRepassesFilters.cnpj.replace(/\D/g, "");
    if (cnpjDigits.length < 11) {
      setMessage("Informe um CNPJ valido para consultar repasses FNS.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadFnsRepasses(token);
      await loadFnsSyncStatus(token);
      setMessage("Relatorio de repasses FNS atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar repasses FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onLoadFnsDetalheBloco = async (codigoBloco: string, nomeBloco?: string) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadFnsRepassesDetalheByBloco(codigoBloco, token);
      setMessage(`Detalhe do bloco ${nomeBloco ?? codigoBloco} carregado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar detalhe de repasses FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSyncFnsCache = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    const cnpjDigits = fnsRepassesFilters.cnpj.replace(/\D/g, "");
    const cnpjs = cnpjDigits.length >= 11 ? [cnpjDigits] : [];
    const ano = Number(fnsRepassesFilters.ano);

    setIsBusy(true);
    setMessage("");
    try {
      const result = await syncFnsCache(token, {
        ano: Number.isFinite(ano) ? ano : undefined,
        cnpjs,
        incluir_ufs: true
      });
      await loadFnsSyncStatus(token);
      setMessage(
        result.status === "running"
          ? "Sincronizacao FNS ja estava em andamento."
          : "Sincronizacao de cache FNS concluida."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar cache FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearFnsRepassesFilters = () => {
    setFnsRepassesFilters(emptyFnsRepassesFilters());
    setFnsMunicipios([]);
    setFnsEntidades([]);
    setFnsRepassesData(null);
    setFnsRepassesDetalheData(null);
    setFnsSaldosData(null);
    setFnsDetalheBlocoLabel("");
  };

  const onApplyConsultaFnsFilters = async (nextPage = 1) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadConsultaFnsPropostas(nextPage, token);
      setMessage("Relatorio Consulta FNS atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar propostas no Consulta FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onOpenConsultaFnsDetalhe = async (item: ConsultaFnsPropostaItem) => {
    if (!token) {
      return;
    }

    const nuPropostaResolved = resolveConsultaFnsNuProposta(item);

    if (nuPropostaResolved === "") {
      const nextFilters: ConsultaFnsFilters = {
        ...consultaFnsFilters,
        nu_proposta: "",
        tp_proposta: item.coTipoProposta ?? "",
        tp_recurso: item.dsTipoRecurso ?? ""
      };

      setConsultaFnsFilters(nextFilters);
      setConsultaFnsDetalhe(null);
      setConsultaFnsSelected(null);
      setIsBusy(true);
      setMessage("");
      try {
        await loadConsultaFnsPropostas(1, token, nextFilters);
        setMessage("Lista refinada por tipo de proposta e recurso para localizar numeros de proposta.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Falha ao refinar lista de propostas.");
      } finally {
        setIsBusy(false);
      }
      return;
    }

    setConsultaFnsSelected(item);
    setIsBusy(true);
    setMessage("");
    try {
      await loadConsultaFnsPropostaDetalhe(nuPropostaResolved, token);
      setMessage(`Detalhe da proposta ${nuPropostaResolved} carregado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar detalhe da proposta.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearConsultaFnsFilters = () => {
    setConsultaFnsFilters(emptyConsultaFnsFilters());
    setConsultaFnsMunicipios([]);
    setConsultaFnsData(null);
    setConsultaFnsPage(1);
    setConsultaFnsSelected(null);
    setConsultaFnsDetalhe(null);
  };

  const onResetConsultaFnsToSearchStart = () => {
    setConsultaFnsFilters(emptyConsultaFnsFilters());
    setConsultaFnsMunicipios([]);
    setConsultaFnsData(null);
    setConsultaFnsPage(1);
    setConsultaFnsSelected(null);
    setConsultaFnsDetalhe(null);
    setMessage("Retornou ao inicio das buscas Consulta FNS.");
  };

  const onExportConsultaFnsAnalitico = () => {
    if (!consultaFnsData || consultaFnsData.itens.length === 0) {
      setMessage("Consulte propostas antes de gerar o relatorio analitico.");
      return;
    }

    const rows = consultaFnsData.itens
      .map((item) => {
        const parlamentar = item.parlamentares?.[0];
        const tipoLinha = resolveConsultaFnsNuProposta(item) !== "" ? "Detalhavel" : "Agregada";
        return `<tr>
          <td>${escapeHtml(tipoLinha)}</td>
          <td>${escapeHtml(item.coTipoProposta ?? "-")}</td>
          <td>${escapeHtml(item.dsTipoRecurso ?? "-")}</td>
          <td>${escapeHtml(resolveConsultaFnsNuProposta(item) || "-")}</td>
          <td>${escapeHtml(item.noEntidade ?? "-")}</td>
          <td>${formatCurrency(item.vlProposta)}</td>
          <td>${formatCurrency(item.vlPago)}</td>
          <td>${formatCurrency(item.vlPagar)}</td>
          <td>${escapeHtml(parlamentar?.noApelidoPolitico ?? "-")}</td>
          <td>${escapeHtml(parlamentar?.sgPartido ?? "-")}</td>
          <td>${escapeHtml(parlamentar?.coEmendaPolitica ?? "-")}</td>
          <td>${escapeHtml(parlamentar?.nuAnoExercicio ?? "-")}</td>
          <td>${parlamentar?.vlIndObjeto == null ? "-" : formatCurrency(Number(parlamentar.vlIndObjeto))}</td>
        </tr>`;
      })
      .join("");

    const detalheHtml =
      consultaFnsDetalhe
        ? `<h2>Detalhe selecionado</h2>
          <p><strong>Proposta:</strong> ${escapeHtml(consultaFnsSelected?.nuProposta ?? consultaFnsDetalhe.nuProposta)}</p>
          <p><strong>Entidade:</strong> ${escapeHtml(consultaFnsDetalhe.noEntidade)} | <strong>Municipio/UF:</strong> ${escapeHtml(consultaFnsDetalhe.noMunicipio)}/${escapeHtml(consultaFnsDetalhe.sgUf)}</p>
          <p><strong>Situacao:</strong> ${escapeHtml(consultaFnsDetalhe.situacao?.descricaoSituacaoproposta ?? "Nao informada")}</p>
          <p><strong>Valor proposta:</strong> ${formatCurrency(consultaFnsDetalhe.vlProposta)} | <strong>Pago:</strong> ${formatCurrency(consultaFnsDetalhe.vlPago)} | <strong>Saldo:</strong> ${formatCurrency(consultaFnsDetalhe.vlPagar)}</p>`
        : "";

    const logoUrl = getReportLogoUrl();
    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Consulta FNS - Relatorio analitico</title><style>body{font-family:Segoe UI,Arial,sans-serif;padding:20px;color:#102a43}.report-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.report-head img{max-width:180px;height:auto;display:block}h1,h2{margin:0 0 10px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{border:1px solid #cbd5e1;padding:6px;font-size:11px;text-align:left;vertical-align:top}.muted{color:#486581}.toolbar{margin:12px 0 16px}.toolbar button{padding:8px 12px;border:1px solid #9fb3c8;background:#e7eff7;color:#102a43;border-radius:6px;cursor:pointer}</style></head><body><div class="report-head"><img src="${logoUrl}" alt="NC Convenios" /><h1>Consulta FNS - Relatorio analitico</h1></div><p class="muted">Gerado em ${new Date().toLocaleString("pt-BR")}</p><div class="toolbar"><button onclick="window.print()">Imprimir / Salvar PDF</button></div><table><thead><tr><th>Tipo linha</th><th>Tipo proposta</th><th>Tipo recurso</th><th>N° proposta</th><th>Entidade</th><th>Valor</th><th>Valor pago</th><th>Saldo</th><th>Parlamentar</th><th>Partido</th><th>Emenda</th><th>Ano</th><th>Valor emenda</th></tr></thead><tbody>${rows || '<tr><td colspan="13">Sem dados para exportacao</td></tr>'}</tbody></table>${detalheHtml}</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const popup = window.open(blobUrl, "_blank", "width=1200,height=900");
    if (!popup) {
      URL.revokeObjectURL(blobUrl);
      setMessage("Nao foi possivel abrir o relatorio. Verifique o bloqueador de pop-ups.");
      return;
    }

    window.setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 60000);
  };

  const onSyncConsultaFnsCache = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    const ano = Number(consultaFnsFilters.ano);
    const count = Number(consultaFnsFilters.count);

    setIsBusy(true);
    setMessage("");
    try {
      const result = await syncConsultaFnsCache(token, {
        ano: Number.isFinite(ano) ? ano : undefined,
        pages_max: 3,
        count: Number.isFinite(count) ? count : 20
      });
      await loadConsultaFnsStatus(token);
      setMessage(
        result.status === "running"
          ? "Sincronizacao Consulta FNS ja estava em andamento."
          : "Sincronizacao de cache Consulta FNS concluida."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar cache Consulta FNS.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCloseConsultaFnsDetalhe = () => {
    setConsultaFnsSelected(null);
    setConsultaFnsDetalhe(null);
    setMessage("Retornou para a lista de propostas Consulta FNS.");
  };

  const onApplySimecObrasFilters = async () => {
    if (!token) {
      return;
    }

    const uf = simecObrasFilters.uf.trim().toUpperCase();
    const muncod = simecObrasFilters.muncod.trim();
    if (uf.length !== 2 || muncod.length < 6) {
      setMessage("Selecione UF e municipio para consultar obras no SIMEC.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadSimecObras(token, { uf });
      setMessage("Relatorio SIMEC Obras atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar obras no SIMEC.");
    } finally {
      setIsBusy(false);
    }
  };

  const onOpenSimecObraDetalhe = async (obraId: number) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await loadSimecObraDetalhe(obraId, token);
      setMessage(`Detalhe da obra ${obraId} carregado.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar detalhe da obra SIMEC.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCloseSimecObraDetalhe = () => {
    setSimecObraDetalhe(null);
    setSimecObraDetalheId(null);
    setMessage("Retornou para a lista de obras do SIMEC.");
  };

  const onClearSimecObrasFilters = () => {
    setSimecObrasFilters(emptySimecObrasFilters());
    setSimecMunicipios([]);
    setSimecObrasData(null);
    setSimecObraDetalhe(null);
    setSimecObraDetalheId(null);
  };

  const typeAssistantMessage = async (payload: {
    text: string;
    intencao?: AssistenteResposta["intencao"];
    contextoUsado?: boolean;
    perguntaInterpretada?: string;
  }) => {
    const messageId = Date.now() + Math.floor(Math.random() * 1000);
    const fullText = payload.text?.trim() ?? "";
    const safeText = fullText === "" ? "Sem resposta no momento." : fullText;
    setAssistenteTypingMessageId(messageId);

    setAssistenteConversa((prev) => [
      ...prev,
      {
        id: messageId,
        role: "assistant",
        text: "",
        createdAt: new Date().toISOString(),
        intencao: payload.intencao,
        contextoUsado: payload.contextoUsado,
        perguntaInterpretada: payload.perguntaInterpretada
      }
    ]);

    await new Promise<void>((resolve) => {
      let cursor = 0;
      const stride = safeText.length > 240 ? 3 : 2;
      const delayMs = safeText.length > 240 ? 12 : 18;

      if (assistenteTypingIntervalRef.current !== null) {
        window.clearInterval(assistenteTypingIntervalRef.current);
      }

      assistenteTypingIntervalRef.current = window.setInterval(() => {
        cursor = Math.min(safeText.length, cursor + stride);
        const partial = safeText.slice(0, cursor);
        setAssistenteConversa((prev) =>
          prev.map((item) =>
            item.id === messageId
              ? {
                  ...item,
                  text: partial
                }
              : item
          )
        );

        if (cursor >= safeText.length) {
          if (assistenteTypingIntervalRef.current !== null) {
            window.clearInterval(assistenteTypingIntervalRef.current);
            assistenteTypingIntervalRef.current = null;
          }
          setAssistenteTypingMessageId(null);
          resolve();
        }
      }, delayMs);
    });
  };

  const onAskAssistente = async () => {
    if (!token) {
      return;
    }

    const pergunta = assistentePergunta.trim();
    if (pergunta === "") {
      setMessage("Digite uma pergunta para o Assistente 360.");
      return;
    }

    const userMessage: AssistenteChatItem = {
      id: Date.now(),
      role: "user",
      text: pergunta,
      createdAt: new Date().toISOString()
    };

    setAssistenteConversa((prev) => [...prev, userMessage]);
    setAssistentePergunta("");
    setIsConsultandoAssistente(true);
    setMessage("");

    try {
      const historico: AssistenteHistoricoItem[] = assistenteConversa
        .filter((item) => item.text.trim() !== "")
        .slice(-10)
        .map((item) => ({ role: item.role, text: item.text }));

      const result = await askAssistentePergunta(token, pergunta, historico);
      await typeAssistantMessage({
        text: result.resposta,
        intencao: result.intencao,
        contextoUsado: result.contexto_usado,
        perguntaInterpretada: result.pergunta_interpretada
      });
    } catch (error) {
      await typeAssistantMessage({
        text: error instanceof Error ? error.message : "Falha ao consultar o Assistente 360.",
        intencao: "nao_entendida"
      });
    } finally {
      setIsConsultandoAssistente(false);
      setAssistenteTypingMessageId(null);
    }
  };

  const onApplyTicketReportFilters = async () => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const items = await listTickets(token, {
        status: ticketReportFilters.status || undefined,
        prioridade: ticketReportFilters.prioridade || undefined,
        origem: ticketReportFilters.origem || undefined,
        somente_atrasados: ticketReportFilters.somente_atrasados,
        responsavel_user_id:
          ticketReportFilters.responsavel_user_id.trim() === ""
            ? undefined
            : Number(ticketReportFilters.responsavel_user_id),
        q: ticketReportFilters.q.trim() === "" ? undefined : ticketReportFilters.q.trim()
      });

      const startDate = ticketReportFilters.data_de ? parseDateOnly(ticketReportFilters.data_de) : null;
      const endDate = ticketReportFilters.data_ate ? parseDateOnly(ticketReportFilters.data_ate) : null;
      const filteredByDate = items.filter((item) => {
        if (!startDate && !endDate) {
          return true;
        }
        const createdAt = new Date(item.created_at);
        const createdUtc = Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate());
        const startUtc = startDate
          ? Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
          : Number.NEGATIVE_INFINITY;
        const endUtc = endDate
          ? Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
          : Number.POSITIVE_INFINITY;
        return createdUtc >= startUtc && createdUtc <= endUtc;
      });

      setTicketReportData(filteredByDate);
      setMessage("Relatorio de tickets atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar relatorio de tickets.");
    } finally {
      setIsBusy(false);
    }
  };

  const onClearTicketReportFilters = () => {
    setTicketReportFilters(emptyTicketReportFilters());
    setTicketReportData(null);
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

  const onExportTicketReportPdf = (mode: ReportPdfMode) => {
    if (!ticketReportData) {
      setMessage("Gere o relatorio de tickets antes de exportar.");
      return;
    }
    exportTicketReportPdf(ticketReportData, mode);
  };

  const onExportTransferenciasDiscricionariasPdf = async (mode: ReportPdfMode) => {
    if (!transferenciasDiscricionariasData) {
      setMessage("Consulte o relatorio de transferencias discricionarias antes de exportar.");
      return;
    }

    const popup = window.open("", "_blank");
    if (!popup) {
      setMessage("Nao foi possivel abrir a janela do PDF. Verifique o bloqueio de pop-ups do navegador.");
      return;
    }

    popup.document.open();
    popup.document.write(
      '<!doctype html><html><head><meta charset="utf-8" /><title>Gerando PDF...</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#102a43"><p>Gerando PDF analitico de transferencias discricionarias...</p></body></html>'
    );
    popup.document.close();

    setIsBusy(true);
    setMessage("");
    try {
      const desembolsoReports: TransferenciaDiscricionariaDesembolsoResponse[] = [];
      let truncatedConvenios = false;
      let partialConvenioCollection = false;
      const failedConvenios: string[] = [];
      let skippedSingleParcelaConvenios = 0;

      if (mode === "analitico" && token) {
        const anoParsed = Number(transferenciasDiscricionariasDesembolsoFilters.ano);
        const mesParsed = Number(transferenciasDiscricionariasDesembolsoFilters.mes);
        const anoFilter = Number.isFinite(anoParsed) && anoParsed >= 2000 ? anoParsed : undefined;
        const mesFilter = Number.isFinite(mesParsed) && mesParsed >= 1 && mesParsed <= 12 ? mesParsed : undefined;

        let conveniosToExport = parseConvenioList(transferenciasDiscricionariasDesembolsoFilters.nr_convenio);

        if (conveniosToExport.length === 0) {
          const convenioSet = new Set<string>();
          const collectConvenios = (items: TransferenciaDiscricionariaResponse["itens"]) => {
            for (const item of items) {
              const convenio = item.nr_convenio?.trim();
              if (!convenio) {
                continue;
              }
              convenioSet.add(convenio);
              if (convenioSet.size >= MAX_CONVENIOS_DESEMBOLSO_PDF) {
                return true;
              }
            }
            return false;
          };

          let reachedCap = collectConvenios(transferenciasDiscricionariasData.itens);

          if (!reachedCap) {
            const totalPages = transferenciasDiscricionariasData.paginacao.total_paginas;
            const currentPage = transferenciasDiscricionariasData.paginacao.pagina;

            for (let page = 1; page <= totalPages; page += 1) {
              if (page === currentPage) {
                continue;
              }

              try {
                const nextPage = await getTransferenciasDiscricionarias(
                  token,
                  buildTransferenciasDiscricionariasQuery(
                    page,
                    TRANSFERENCIAS_PAGE_SIZE_MAX,
                    transferenciasDiscricionariasFilters
                  )
                );
                reachedCap = collectConvenios(nextPage.itens);
                if (reachedCap) {
                  break;
                }
              } catch {
                partialConvenioCollection = true;
                break;
              }
            }
          }

          conveniosToExport = Array.from(convenioSet);
          truncatedConvenios = reachedCap;
        }

        if (conveniosToExport.length > MAX_CONVENIOS_DESEMBOLSO_PDF) {
          conveniosToExport = conveniosToExport.slice(0, MAX_CONVENIOS_DESEMBOLSO_PDF);
          truncatedConvenios = true;
        }

        for (const convenio of conveniosToExport) {
          try {
            const firstPage = await getTransferenciasDiscricionariasDesembolsos(token, {
              nr_convenio: convenio,
              ano: anoFilter,
              mes: mesFilter,
              page: 1,
              page_size: DESEMBOLSOS_PAGE_SIZE_MAX
            });

            const allItems = [...firstPage.itens];
            for (let page = 2; page <= firstPage.paginacao.total_paginas; page += 1) {
              const next = await getTransferenciasDiscricionariasDesembolsos(token, {
                nr_convenio: convenio,
                ano: anoFilter,
                mes: mesFilter,
                page,
                page_size: DESEMBOLSOS_PAGE_SIZE_MAX
              });
              allItems.push(...next.itens);
            }

            if (allItems.length > 1) {
              desembolsoReports.push({
                ...firstPage,
                itens: allItems,
                paginacao: {
                  ...firstPage.paginacao,
                  pagina: 1,
                  tamanho_pagina: allItems.length,
                  total: allItems.length,
                  total_paginas: 1,
                  tem_anterior: false,
                  tem_proxima: false
                }
              });
            } else if (allItems.length === 1) {
              skippedSingleParcelaConvenios += 1;
            }
          } catch {
            failedConvenios.push(convenio);
          }
        }
      }

      exportTransferenciasDiscricionariasPdf(transferenciasDiscricionariasData, mode, desembolsoReports, popup);

      if (mode !== "analitico") {
        setMessage("PDF de transferencias discricionarias gerado com sucesso.");
      } else if (desembolsoReports.length === 0) {
        setMessage(
          "PDF analitico gerado sem secoes de desembolso (apenas convenios com mais de uma parcela sao listados)."
        );
      } else if (
        truncatedConvenios ||
        partialConvenioCollection ||
        failedConvenios.length > 0 ||
        skippedSingleParcelaConvenios > 0
      ) {
        const problemas: string[] = [];
        if (truncatedConvenios) {
          problemas.push(`limite de ${MAX_CONVENIOS_DESEMBOLSO_PDF} convenios`);
        }
        if (partialConvenioCollection) {
          problemas.push("falha parcial na coleta de convenios");
        }
        if (failedConvenios.length > 0) {
          problemas.push(`${failedConvenios.length} convenio(s) com erro ao buscar desembolsos`);
        }
        if (skippedSingleParcelaConvenios > 0) {
          problemas.push(`${skippedSingleParcelaConvenios} convenio(s) ignorado(s) por terem apenas 1 parcela`);
        }
        setMessage(
          `PDF analitico gerado com ${desembolsoReports.length} convenio(s) e ajustes por: ${problemas.join(", ")}.`
        );
      } else {
        setMessage(`PDF analitico gerado com historico completo de desembolsos em ${desembolsoReports.length} convenio(s).`);
      }
    } catch (error) {
      popup.close();
      setMessage(error instanceof Error ? error.message : "Falha ao exportar PDF de transferencias discricionarias.");
    } finally {
      setIsBusy(false);
    }
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

  const onSearchProponenteSugestoes = async () => {
    if (!token) {
      return;
    }

    const busca = proponenteCadastro.busca.trim();
    if (busca.length < 2) {
      setMessage("Digite ao menos 2 caracteres para buscar proponentes no Transferegov.");
      setProponenteSugestoes([]);
      setProponenteCadastro((prev) => ({ ...prev, cnpj_selecionado: "" }));
      return;
    }

    setIsLoadingProponenteSugestoes(true);
    setMessage("");
    try {
      const result = await searchProponentesDaBase(token, { q: busca, limit: 20 });
      setProponenteSugestoes(result.itens);
      setProponenteCadastro((prev) => ({
        ...prev,
        cnpj_selecionado: result.itens[0]?.cnpj ?? ""
      }));

      if (result.itens.length === 0) {
        setMessage("Nenhum proponente encontrado na base do Transferegov para o termo informado.");
      } else {
        setMessage(`${result.itens.length} proponente(s) encontrado(s) na base do Transferegov.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao buscar proponentes na base do Transferegov.");
    } finally {
      setIsLoadingProponenteSugestoes(false);
    }
  };

  const onAddProponenteAtendido = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    const selected = proponenteSugestoes.find((item) => item.cnpj === proponenteCadastro.cnpj_selecionado);
    if (!selected) {
      setMessage("Selecione um proponente da lista para adicionar.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const created = await createProponenteFromBase(token, {
        cnpj: selected.cnpj,
        nome_proponente: selected.nome_proponente,
        uf: selected.uf ?? undefined,
        cidade: selected.cidade ?? undefined
      });

      await Promise.all([loadProponentes(), loadInstruments(), loadDashboard()]);

      const resumo = created.importacao;
      if (resumo) {
        setMessage(
          `Proponente ${selected.nome_proponente} adicionado(a). Importacao automatica: ${resumo.criados} criado(s), ${resumo.atualizados} atualizado(s), ${resumo.ignorados} ignorado(s), ${resumo.erros} erro(s).`
        );
      } else {
        setMessage(`Proponente ${selected.nome_proponente} adicionado(a) com sucesso.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao adicionar proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onDeleteProponente = async (id: number) => {
    if (!token || !canDeactivateInstruments) {
      return;
    }

    if (!window.confirm("Confirma remover este proponente da lista de atendimento?")) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      await deleteProponente(token, id);
      await loadProponentes();
      setMessage("Proponente removido com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onReimportProponenteInstrumentos = async (item: Proponente) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const result = await reimportarInstrumentosProponente(token, item.id);
      await Promise.all([loadInstruments(), loadDashboard()]);
      setMessage(
        `Reimportacao de ${item.nome}: ${result.importacao.criados} criado(s), ${result.importacao.atualizados} atualizado(s), ${result.importacao.ignorados} ignorado(s), ${result.importacao.erros} erro(s).`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao reimportar instrumentos do proponente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onReimportTodosProponentesInstrumentos = async () => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const result = await reimportarInstrumentosTodosProponentes(token);
      await Promise.all([loadInstruments(), loadDashboard()]);
      setMessage(
        `Reimportacao em lote concluida (${result.total_proponentes} proponente(s)): ${result.criados} criado(s), ${result.atualizados} atualizado(s), ${result.ignorados} ignorado(s), ${result.erros} erro(s).`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao reimportar instrumentos de todos os proponentes.");
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
      setShowTicketCreateModal(false);
      setMessage(`Ticket ${created.codigo} criado com sucesso.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSelectTicket = async (id: number, syncUrl = true) => {
    if (!token) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const full = await getTicketById(token, id);
      setSelectedTicket(full);
      setTicketIdFromUrl(id);
      setTicketResolutionReason(full.motivo_resolucao ?? "");
      if (syncUrl) {
        const nextUrl = `/?ticket=${id}`;
        if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
          window.history.pushState({}, "", nextUrl);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCloseTicketDetail = () => {
    setSelectedTicket(null);
    setTicketIdFromUrl(null);
    setTicketResolutionReason("");
    setTicketCommentText("");
    if (window.location.search !== "") {
      window.history.pushState({}, "", "/");
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
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
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
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
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
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
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
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
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
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
      setTicketCommentText("");
      setMessage("Comentario registrado no ticket.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar comentario.");
    } finally {
      setIsBusy(false);
    }
  };

  const onToggleTicketChecklistItem = async (ticketId: number, itemId: number, concluido: boolean) => {
    if (!token || !canManageInstruments) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const { toggleTicketChecklistItem: toggleFn } = await import("./api");
      const updated = await toggleFn(token, ticketId, itemId, concluido);
      setSelectedTicket(updated);
      setTickets((prev) => moveUpdatedTicketToTop(prev, updated));
      setMessage(concluido ? "Item marcado como concluido." : "Item marcado como pendente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao atualizar checklist do ticket.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSyncRepassesFromDesembolsos = async () => {
    if (!token || !profileInstrument) {
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updatedWithRepasses = await withLoadedRepasses(token, profileInstrument);
      setInstruments((prev) => prev.map((item) => (item.id === updatedWithRepasses.id ? updatedWithRepasses : item)));
      setSelectedInstrument(updatedWithRepasses);
      setReportData(null);
      setObraReportData(null);
      setMessage("Lista de repasses sincronizada automaticamente pelos desembolsos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao sincronizar repasses automaticamente.");
    } finally {
      setIsBusy(false);
    }
  };

  const onSaveEmpresaVencedora = async () => {
    if (!token || !profileInstrument || !canManageInstruments) {
      return;
    }

    const empresa = empresaVencedoraNomeInput.trim();
    const cnpj = empresaVencedoraCnpjInput.trim();
    const valorVencedor = parseCurrencyInput(empresaVencedoraValorInput);

    if (empresa === "") {
      setMessage("Informe a empresa vencedora.");
      return;
    }

    if (cnpj === "") {
      setMessage("Informe o CNPJ da empresa vencedora.");
      return;
    }

    if (Number.isNaN(valorVencedor) || valorVencedor <= 0) {
      setMessage("Informe o valor vencedor em reais.");
      return;
    }

    setIsBusy(true);
    setMessage("");
    try {
      const updated = await updateInstrument(token, profileInstrument.id, {
        empresa_vencedora: empresa,
        cnpj_vencedora: cnpj,
        valor_vencedor: valorVencedor,
        orgao_executor: `${empresa} - ${cnpj}`
      });
      const updatedWithRepasses = await withLoadedRepasses(token, updated);
      setInstruments((prev) => prev.map((item) => (item.id === updatedWithRepasses.id ? updatedWithRepasses : item)));
      setSelectedInstrument(updatedWithRepasses);
      setMessage("Dados da empresa vencedora salvos com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar empresa vencedora.");
    } finally {
      setIsBusy(false);
    }
  };

  const onLoadSolicitacoesCaixa = async () => {
    if (!token || instrumentPageId === null) return;
    setSolicitacoesCaixaLoading(true);
    try {
      const result = await listSolicitacoesCaixa(token, instrumentPageId);
      setSolicitacoesCaixaItens(result.itens);
    } catch (error) {
      setMessage("Falha ao carregar solicitacoes.");
    } finally {
      setSolicitacoesCaixaLoading(false);
    }
  };

  const onLoadCertificates = async () => {
    if (!token) return;
    try {
      const result = await listCertificates(token);
      setCertificates(result.certificados);
    } catch (error) {
      setMessage("Falha ao carregar certificados.");
    }
  };

  const onLoadDocuments = async () => {
    if (!token) return;
    try {
      const result = await listDocuments(token);
      setDocuments(result.documentos);
    } catch (error) {
      console.error("[documents] Falha ao listar documentos", error);
      setMessage("Falha ao carregar documentos.");
    }
  };

  const onLoadDocumentAiRequests = async (override?: {
    status?: "" | DocumentAiRequestStatus;
    prioridade?: "" | DocumentAiRequestPriority;
    q?: string;
  }) => {
    if (!token) {
      return;
    }

    setIsLoadingDocumentAiRequests(true);
    try {
      const status = override?.status ?? documentAiRequestFilterStatus;
      const prioridade = override?.prioridade ?? documentAiRequestFilterPriority;
      const q = override?.q ?? documentAiRequestFilterQuery;
      const result = await listDocumentAiRequests(token, {
        status: status || undefined,
        prioridade: prioridade || undefined,
        q: q.trim() || undefined,
        limit: 100
      });
      setDocumentAiRequests(result.itens);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar solicitacoes de documentos.");
    } finally {
      setIsLoadingDocumentAiRequests(false);
    }
  };

  const onCreateDocumentAiRequest = async () => {
    if (!token) {
      return;
    }

    const titulo = documentAiRequestForm.titulo.trim();
    if (titulo.length < 3) {
      setMessage("Informe um titulo com pelo menos 3 caracteres para a solicitacao.");
      return;
    }

    setBusyDocumentAiRequestId(-1);
    setMessage("");
    try {
      await createDocumentAiRequest(token, {
        titulo,
        descricao: documentAiRequestForm.descricao.trim() || undefined,
        prioridade: documentAiRequestForm.prioridade,
        prazo: documentAiRequestForm.prazo ? new Date(`${documentAiRequestForm.prazo}T23:59:59`).toISOString() : undefined
      });
      setDocumentAiRequestForm((prev) => ({ ...prev, titulo: "", descricao: "", prazo: "" }));
      setMessage("Solicitacao criada com sucesso.");
      await onLoadDocumentAiRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao criar solicitacao de documentos.");
    } finally {
      setBusyDocumentAiRequestId(null);
    }
  };

  const onGenerateDocumentAiRequestLink = async (requestId: number) => {
    if (!token) {
      return;
    }

    setBusyDocumentAiRequestId(requestId);
    setMessage("");
    try {
      const result = await createDocumentAiRequestPublicLink(token, requestId, {
        validade_dias: documentAiRequestForm.validadeDias
      });
      await navigator.clipboard.writeText(result.link_publico);
      setMessage("Link publico gerado e copiado para a area de transferencia.");
      await onLoadDocumentAiRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao gerar link publico.");
    } finally {
      setBusyDocumentAiRequestId(null);
    }
  };

  const onDeactivateDocumentAiRequestLink = async (requestId: number) => {
    if (!token) {
      return;
    }

    setBusyDocumentAiRequestId(requestId);
    setMessage("");
    try {
      await deactivateDocumentAiRequestPublicLink(token, requestId);
      setMessage("Link publico desativado.");
      await onLoadDocumentAiRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao desativar link publico.");
    } finally {
      setBusyDocumentAiRequestId(null);
    }
  };

  const onCancelDocumentAiRequest = async (requestId: number) => {
    if (!token) {
      return;
    }

    setBusyDocumentAiRequestId(requestId);
    setMessage("");
    try {
      await updateDocumentAiRequest(token, requestId, { status: "CANCELADA" });
      setMessage("Solicitacao cancelada.");
      await onLoadDocumentAiRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao cancelar solicitacao.");
    } finally {
      setBusyDocumentAiRequestId(null);
    }
  };

  const onCopyDocumentAiRequestLink = async (link: string) => {
    if (!link) {
      setMessage("Nenhum link ativo para copiar.");
      return;
    }

    try {
      await navigator.clipboard.writeText(toAbsoluteUrl(link));
      setMessage("Link copiado para a area de transferencia.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao copiar link.");
    }
  };

  const onSearchDocuments = async () => {
    if (!token) {
      return;
    }

    const query = documentSearchQuery.trim();
    if (!query) {
      setMessage("Informe um termo para busca inteligente.");
      return;
    }

    setIsSearchingDocuments(true);
    setMessage("");
    try {
      const runSearch = documentSearchSemantic ? searchDocumentsSemantic : searchDocuments;
      const response = await runSearch(token, {
        q: query,
        status: documentSearchStatus || undefined,
        data_de: documentSearchDataDe || undefined,
        data_ate: documentSearchDataAte || undefined,
        limit: 40
      });
      setDocumentSearchResults(response.resultados);
      setMessage(`${response.total} resultado(s) encontrado(s) na busca ${documentSearchSemantic ? "semantica" : "lexical"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao pesquisar documentos.");
    } finally {
      setIsSearchingDocuments(false);
    }
  };

  const onClassifyDocument = async (id: number) => {
    if (!token) {
      return;
    }

    setClassifyingDocumentId(id);
    try {
      await classifyDocument(token, id);
      setMessage("Classificacao IA atualizada com sucesso.");
      await onLoadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao classificar documento.");
    } finally {
      setClassifyingDocumentId(null);
    }
  };

  const onReindexDocument = async (id: number) => {
    if (!token) {
      return;
    }
    setReindexingDocumentId(id);
    try {
      await reindexDocument(token, id);
      setMessage("Reindexacao solicitada. Aguarde alguns segundos e atualize a lista.");
      await onLoadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao reindexar documento.");
    } finally {
      setReindexingDocumentId(null);
    }
  };

  const onOpenDocumentQa = (id: number, titulo: string) => {
    setQaDocumentId(id);
    setQaDocumentTitle(titulo);
    setQaQuestion("");
    setQaAnswer("");
    setQaSources([]);
  };

  const onAskDocumentQuestion = async () => {
    if (!token || qaDocumentId === null) {
      return;
    }
    const question = qaQuestion.trim();
    if (question.length < 3) {
      setMessage("Informe uma pergunta com pelo menos 3 caracteres.");
      return;
    }

    setIsAskingDocument(true);
    setMessage("");
    try {
      const result = await askDocumentQuestion(token, qaDocumentId, question);
      setQaAnswer(result.resposta);
      setQaSources(result.fontes);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao consultar IA do documento.");
    } finally {
      setIsAskingDocument(false);
    }
  };

  const onLoadActiveCertificates = async () => {
    if (!token) return;
    try {
      const certs = await getActiveCertificates(token);
      setActiveCertificates(certs);
    } catch (error) {
      console.error("Falha ao carregar certificados ativos:", error);
    }
  };

  const onCreateCertificate = async () => {
    if (!token || !certificateForm.nome || !certificateForm.titular || !certificateForm.cpf || !certificateForm.validade || !certificateForm.arquivo || !certificateForm.senha) {
      setMessage("Preencha todos os campos obrigatorios.");
      return;
    }
    setIsBusy(true);
    try {
      await createCertificate(token, certificateForm);
      setMessage("Certificado cadastrado com sucesso.");
      setCertificateForm({ nome: "", titular: "", cpf: "", validade: "", arquivo: "", senha: "" });
      onLoadCertificates();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao cadastrar certificado.");
    } finally {
      setIsBusy(false);
    }
  };

  const onRevokeCertificate = async (id: number) => {
    if (!token) return;
    setIsBusy(true);
    try {
      await revokeCertificate(token, id);
      setMessage("Certificado revogado com sucesso.");
      onLoadCertificates();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao revogar certificado.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCreateDocument = async () => {
    const titulo = documentForm.titulo.trim();
    const arquivo = documentForm.arquivo ?? documentUploadInputRef.current?.files?.[0] ?? null;
    const arquivoNome = documentForm.arquivo_nome.trim() || arquivo?.name || "";

    if (!token) {
      setMessage("Sessao expirada. Faca login novamente.");
      return;
    }

    if (!titulo) {
      setMessage("Preencha o titulo do documento.");
      return;
    }

    if (!arquivo) {
      setMessage("Selecione um arquivo PDF.");
      console.warn("[documents] Tentativa sem arquivo no estado", {
        titulo,
        arquivoNomeDigitado: documentForm.arquivo_nome
      });
      return;
    }

    setIsUploadingDocument(true);
    try {
      const createdDocument = await createDocument(token, {
        titulo,
        descricao: documentForm.descricao,
        arquivo,
        arquivo_nome: arquivoNome
      });

      setDocuments((prev) => [
        {
          ...createdDocument,
          criado_por: user ? { id: user.id, nome: user.nome, email: user.email } : { id: 0, nome: "", email: "" },
          assinaturas: []
        },
        ...prev.filter((item) => item.id !== createdDocument.id)
      ]);

      setMessage("Documento carregado com sucesso.");
      setDocumentForm({ titulo: "", descricao: "", arquivo: null, arquivo_nome: "" });
      if (documentUploadInputRef.current) {
        documentUploadInputRef.current.value = "";
      }
      void onLoadDocuments();
    } catch (error) {
      console.error("[documents] Falha ao carregar documento", {
        titulo: documentForm.titulo,
        arquivoNome: documentForm.arquivo_nome,
        arquivoSize: documentForm.arquivo?.size,
        arquivoType: documentForm.arquivo?.type,
        error
      });
      setMessage(error instanceof Error ? error.message : "Falha ao carregar documento.");
    } finally {
      setIsUploadingDocument(false);
    }
  };

  const onDeleteDocument = async (id: number, status: string) => {
    if (status === "ASSINADO") {
      setMessage("Nao e possivel excluir documento assinado.");
      return;
    }

    if (!token) {
      setMessage("Sessao expirada. Faca login novamente.");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    setDeletingDocumentId(id);
    try {
      await deleteDocument(token, id);
      setMessage("Documento excluido com sucesso.");
      onLoadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao excluir documento.");
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const onDownloadDocument = async (id: number, arquivoNome: string) => {
    if (!token) {
      setMessage("Sessao expirada. Faca login novamente.");
      return;
    }

    try {
      await downloadDocument(token, id, arquivoNome || "documento.pdf");
    } catch (error) {
      console.error("[documents] Falha ao baixar documento", { id, arquivoNome, error });
      setMessage(error instanceof Error ? error.message : "Falha ao baixar documento.");
    }
  };

  const onOpenSignModal = (docId: number) => {
    setSignDocumentId(docId);
    setSignCertificateId(null);
    setSignPassword("");
    onLoadActiveCertificates();
    setShowSignModal(true);
  };

  const onSignDocument = async () => {
    if (!token || !signDocumentId || !signCertificateId || !signPassword) {
      setMessage("Selecione um documento e certificado e informe a senha.");
      return;
    }
    setIsBusy(true);
    try {
      await signDocument(token, { document_id: signDocumentId, certificate_id: signCertificateId, senha: signPassword });
      setMessage("Documento assinado com sucesso!");
      setShowSignModal(false);
      onLoadDocuments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao assinar documento.");
    } finally {
      setIsBusy(false);
    }
  };

  const onOpenTicketFromSolicitacao = async (ticketId: number) => {
    if (!token) return;
    try {
      const fullTicket = await getTicketById(token, ticketId);
      setSelectedTicket(fullTicket);
      setShowTicketModalFromSolicitacao(true);
    } catch (error) {
      setMessage("Falha ao carregar detalhes do ticket.");
    }
  };

  const onSearchTicketInstrument = async (q: string) => {
    setTicketInstrumentSearch(q);
    if (q.length < 2) {
      setTicketInstrumentResults([]);
      return;
    }
    setTicketInstrumentSearching(true);
    try {
      const results = await searchInstrumentos(token, q);
      setTicketInstrumentResults(results);
    } catch {
      setTicketInstrumentResults([]);
    } finally {
      setTicketInstrumentSearching(false);
    }
  };

  const onAssociateTicketInstrument = async (instrumentId: number) => {
    if (!token || !selectedTicket) return;
    setIsBusy(true);
    setMessage("");
    try {
      const result = await associateTicketInstrument(token, selectedTicket.id, instrumentId);
      setSelectedTicket(result.ticket);
      setTickets((prev) => moveUpdatedTicketToTop(prev, result.ticket));
      setTicketInstrumentSearch("");
      setTicketInstrumentResults([]);
      setMessage("Instrumento associado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao associar instrumento.");
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
            Proponente
            <select value={form.proponente_id} onChange={(e) => onChangeForm("proponente_id", e.target.value)}>
              <option value="">Nao associado</option>
              {proponentes.map((item) => (
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
              <div className="feature-item feature-item-instrumentos">
                <span className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M3.75 6.75a2.25 2.25 0 0 1 2.25-2.25h4.2a2.25 2.25 0 0 1 1.6.66l.9.9c.42.42.99.66 1.6.66h3.75a2.25 2.25 0 0 1 2.25 2.25v8.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6.75Z" />
                  </svg>
                </span>
                <p className="eyebrow">Instrumentos</p>
                <p>CRUD completo com filtros por status, concedente, vigencia e ativo.</p>
              </div>
              <div className="feature-item feature-item-checklist">
                <span className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M8.25 7.5h9M8.25 12h9m-9 4.5h9" />
                    <path d="M4.5 7.5h.008v.008H4.5V7.5Zm0 4.5h.008v.008H4.5V12Zm0 4.5h.008v.008H4.5V16.5Z" />
                  </svg>
                </span>
                <p className="eyebrow">Checklist</p>
                <p>Controle de documentos obrigatorios com upload, download e pendencias.</p>
              </div>
              <div className="feature-item feature-item-auditoria">
                <span className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M6.75 3.75h7.5l3 3v13.5h-10.5a2.25 2.25 0 0 1-2.25-2.25V6a2.25 2.25 0 0 1 2.25-2.25Z" />
                    <path d="M14.25 3.75V6a.75.75 0 0 0 .75.75h2.25M8.25 10.5h7.5m-7.5 3h7.5m-7.5 3h4.5" />
                  </svg>
                </span>
                <p className="eyebrow">Auditoria</p>
                <p>Historico de alteracoes com usuario, data e campos alterados.</p>
              </div>
              <div className="feature-item feature-item-painel">
                <span className="feature-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M4.5 19.5h15" />
                    <path d="M7.5 16.5v-4.5m4.5 4.5V8.25m4.5 8.25v-6" />
                    <path d="M6.75 9.75 12 6.75l4.5 2.25" />
                  </svg>
                </span>
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
              <img className="auth-logo" src="/api/v1/public/brand-logo" alt="NC Convenios" />
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
      <div className={appShellClassName}>
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
            className={activeView === "proponentes" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("proponentes")}
          >
            Proponente
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
            className={activeView === "assinaturas" && signatureTab === "documentos" ? "menu-item active" : "menu-item"}
            onClick={() => {
              setSignatureTab("documentos");
              onChangeView("assinaturas");
            }}
          >
            Documentos IA
          </button>
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
            className={activeView === "assistente" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("assistente")}
          >
            Assistente 360
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
          {activeView !== "tickets" && (
          <>
          <header className="card topbar">
            <div>
              <h2>
                {activeView === "dashboard"
                  ? "Dashboard"
                  : activeView === "instrumentos"
                    ? isInstrumentProfileView
                      ? `Acompanhamento do instrumento #${instrumentPageId}`
                      : "Instrumentos e Propostas"
                    : activeView === "proponentes"
                      ? "Cadastro de Proponentes"
                    : activeView === "usuarios"
                      ? "Gestao de Usuarios"
                    : activeView === "auditoria"
                      ? "Auditoria e Historico"
                    : activeView === "assinaturas"
                      ? signatureTab === "documentos"
                        ? "Documentos Inteligentes"
                        : "Certificados Digitais"
                      : activeView === "assistente"
                        ? "Assistente 360"
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
          </>
          )}

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
                    Proponente
                    <select
                      value={filters.proponente_id}
                      onChange={(e) => setFilters((prev) => ({ ...prev, proponente_id: e.target.value }))}
                    >
                      <option value="">Todos</option>
                      {proponentes.map((item) => (
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
                              setShowSolicitacoesCaixaPanel(false);
                            }}
                          >
                            Acompanhamento de obras
                          </button>
                        )}
                        {profileInstrument && (
                          <button
                            type="button"
                            className={`secondary panel-toggle${showSolicitacoesCaixaPanel ? " active" : ""}`}
                            onClick={() => {
                              const willOpen = !showSolicitacoesCaixaPanel;
                              setShowSolicitacoesCaixaPanel(willOpen);
                              setShowRepassePanel(false);
                              setShowWorkProgressPanel(false);
                              if (willOpen) {
                                onLoadSolicitacoesCaixa();
                              }
                            }}
                          >
                            Solicitações Caixa
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
                          <strong>Proponente:</strong>{" "}
                          {(profileInstrument.proponente_id ?? profileInstrument.convenete_id)
                            ? (proponenteNameById.get(profileInstrument.proponente_id ?? profileInstrument.convenete_id ?? 0) ??
                              `#${profileInstrument.proponente_id ?? profileInstrument.convenete_id}`)
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

                            <p className="subtitle">
                              Lista sincronizada automaticamente pelos desembolsos do Transferegov.
                            </p>
                            <div className="action-row compact">
                              <button type="button" className="secondary" onClick={onSyncRepassesFromDesembolsos} disabled={isBusy}>
                                Sincronizar agora
                              </button>
                            </div>

                            <div className="repasse-list">
                              {profileInstrumentRepasses.length === 0 ? (
                                <p>Nenhum repasse cadastrado.</p>
                              ) : (
                                profileInstrumentRepasses.map((repasse) => (
                                  <div key={repasse.id} className="repasse-item">
                                    <span>{repasse.data_repasse}</span>
                                    <strong>{formatCurrency(repasse.valor_repasse)}</strong>
                                    <span className="subtitle">Origem: Desembolso</span>
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
                              Empresa vencedora: {profileInstrument.empresa_vencedora?.trim() || "Nao informada"} | CNPJ: {" "}
                              {profileInstrument.cnpj_vencedora?.trim() || "Nao informado"}
                            </p>
                            <p className="subtitle">
                              Valor vencedor: {formatCurrency(profileInstrument.valor_vencedor ?? 0)}
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

                        {showSolicitacoesCaixaPanel && (
                          <div className="work-progress-card">
                            <h3>Solicitações Caixa</h3>
                            <p className="subtitle">
                              Historico de interacoes deste instrumento com a Caixa.
                            </p>
                            {solicitacoesCaixaLoading ? (
                              <p>Carregando...</p>
                            ) : solicitacoesCaixaItens.length === 0 ? (
                              <p className="subtitle">Nenhuma solicitacao registrada.</p>
                            ) : (
                              <div className="solicitacoes-caixa-list">
                                {solicitacoesCaixaItens.map((item) => (
                                  <div key={item.id} className="solicitacao-caixa-item">
                                    <div className="solicitacao-caixa-header">
                                      <span className={`solicitacao-caixa-tipo tipo-${item.tipo.toLowerCase()}`}>
                                        {item.tipo === "EMAIL_RECEBIDO" && "📧 E-mail"}
                                        {item.tipo === "COMENTARIO_TICKET" && "💬 Comentario"}
                                        {item.tipo === "RESPOTA_ENVIADA" && "📤 Resposta"}
                                        {item.tipo === "ASSOCIAÇÃO_MANUAL" && "🔗 Associacao"}
                                      </span>
                                      <span className="solicitacao-caixa-data">
                                        {new Date(item.created_at).toLocaleString("pt-BR")}
                                      </span>
                                    </div>
                                    <p className="solicitacao-caixa-desc">{item.descricao}</p>
                                    {item.origem_email && (
                                      <p className="subtitle">De: {item.origem_email}</p>
                                    )}
                                    {item.assunto_email && (
                                      <p className="subtitle">Assunto: {item.assunto_email}</p>
                                    )}
                                    {item.ticket && (
                                      <p className="subtitle">
                                        Ticket: <a href="#" onClick={(e) => { e.preventDefault(); onOpenTicketFromSolicitacao(item.ticket.id); }}>{item.ticket.codigo}</a>
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {showTicketModalFromSolicitacao && selectedTicket && (
                          <div className="stage-followup-modal-overlay" onClick={() => setShowTicketModalFromSolicitacao(false)}>
                            <div className="ticket-modal-content" onClick={(event) => event.stopPropagation()}>
                              <div className="ticket-modal-header">
                                <div>
                                  <p className="eyebrow">{selectedTicket.codigo}</p>
                                  <h3>{selectedTicket.titulo}</h3>
                                  <p className="subtitle">
                                    {TICKET_STATUS_LABELS[selectedTicket.status]} | {TICKET_SOURCE_LABELS[selectedTicket.origem]} | Criado em {" "}
                                    {new Date(selectedTicket.created_at).toLocaleString("pt-BR")}
                                  </p>
                                </div>
                                <button type="button" className="ghost" onClick={() => setShowTicketModalFromSolicitacao(false)}>
                                  Fechar
                                </button>
                              </div>
                              <div className="ticket-modal-body">
                                <p>
                                  <strong>Instrumento:</strong>{" "}
                                  {formatTicketInstrumentLabel(selectedTicket, "Nao informado")}
                                </p>
                                <p>
                                  <strong>Responsavel:</strong> {selectedTicket.responsavel?.nome ?? "Nao atribuido"}
                                </p>
                                <div className="ticket-description-block">
                                  <strong>Descricao:</strong>
                                  <div className="ticket-description-text">{selectedTicket.descricao ?? "Sem descricao"}</div>
                                </div>
                                <p>
                                  <strong>Prazo alvo:</strong>{" "}
                                  {selectedTicket.prazo_alvo ? formatDateOnlyPtBr(selectedTicket.prazo_alvo) : "Nao definido"}
                                </p>
                                {selectedTicket.resolvido_em && (
                                  <p>
                                    <strong>Resolvido em:</strong> {formatDateOnlyPtBr(selectedTicket.resolvido_em)}
                                  </p>
                                )}
                                {selectedTicket.motivo_resolucao && (
                                  <p>
                                    <strong>Motivo da resolucao:</strong> {selectedTicket.motivo_resolucao}
                                  </p>
                                )}
                                {selectedTicket.comentarios && selectedTicket.comentarios.length > 0 && (
                                  <div className="ticket-comments-section">
                                    <h4>Comentarios ({selectedTicket.comentarios.length})</h4>
                                    {selectedTicket.comentarios.map((comment) => (
                                      <div key={comment.id} className="ticket-comment">
                                        <div className="ticket-comment-head">
                                          <strong>{comment.user.nome}</strong>
                                          <span className="subtitle">
                                            {new Date(comment.created_at).toLocaleString("pt-BR")}
                                          </span>
                                        </div>
                                        <p>{comment.mensagem}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {selectedTicket.checklist_itens && selectedTicket.checklist_itens.length > 0 && (
                                  <div className="ticket-checklist-section">
                                    <h4>Pendencias ({selectedTicket.checklist_itens.length})</h4>
                                    {selectedTicket.checklist_itens.map((item) => (
                                      <div key={item.id} className="ticket-checklist-item">
                                        <span className={item.concluido ? "checklist-done" : "checklist-pending"}>
                                          {item.concluido ? "✅" : "⬜"}
                                        </span>
                                        <span>{item.descricao}</span>
                                        {item.concluido_em && (
                                          <span className="subtitle">
                                            Concluido em: {new Date(item.concluido_em).toLocaleString("pt-BR")}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {!showRepassePanel && !showWorkProgressPanel && !showSolicitacoesCaixaPanel && (
                          <div className="checklist-card">
                          <div className="checklist-head">
                            <h3>Fluxo de liberacao do recurso federal - {FLOW_TYPE_LABELS[currentFlowType]}</h3>
                            <div className="checklist-head-meta">
                              {canManageInstruments && allowChecklistExternalLink && (
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
                                            <h5>Dados do vencedor da licitacao</h5>
                                            {canManageInstruments ? (
                                              <>
                                                <div className="filters-grid columns-3">
                                                  <input
                                                    value={empresaVencedoraNomeInput}
                                                    onChange={(e) => setEmpresaVencedoraNomeInput(e.target.value)}
                                                    placeholder="Empresa vencedora"
                                                  />
                                                  <input
                                                    value={empresaVencedoraCnpjInput}
                                                    onChange={(e) => setEmpresaVencedoraCnpjInput(e.target.value)}
                                                    placeholder="CNPJ da vencedora"
                                                  />
                                                  <input
                                                    value={empresaVencedoraValorInput}
                                                    onChange={(e) => setEmpresaVencedoraValorInput(e.target.value)}
                                                    onBlur={() =>
                                                      setEmpresaVencedoraValorInput(
                                                        normalizeCurrencyInput(empresaVencedoraValorInput)
                                                      )
                                                    }
                                                    placeholder="Valor vencedor (R$)"
                                                  />
                                                </div>
                                                <div className="action-row compact">
                                                  <button type="button" onClick={onSaveEmpresaVencedora} disabled={isBusy}>
                                                    Salvar dados do vencedor
                                                  </button>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <p className="subtitle">
                                                  Empresa: {profileInstrument?.empresa_vencedora?.trim() || "Nao informada"}
                                                </p>
                                                <p className="subtitle">
                                                  CNPJ: {profileInstrument?.cnpj_vencedora?.trim() || "Nao informado"}
                                                </p>
                                                <p className="subtitle">
                                                  Valor vencedor: {formatCurrency(profileInstrument?.valor_vencedor ?? 0)}
                                                </p>
                                              </>
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
                                                    {allowChecklistExternalLink && item.solicitacao_externa && (
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
                                                    {canManageInstruments && allowChecklistExternalLink && (
                                                      <button
                                                        type="button"
                                                        className="ghost"
                                                        onClick={() => onGenerateChecklistExternalLink(item.id)}
                                                        disabled={busyExternalLinkItemId === item.id}
                                                      >
                                                        {item.solicitacao_externa ? "Gerar novo link externo" : "Gerar link externo"}
                                                      </button>
                                                    )}
                                                    {canManageInstruments && allowChecklistExternalLink && item.solicitacao_externa && (
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
                                                        onClick={() => onDeleteChecklistItem(item.id, item.nome_documento)}
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
          ) : activeView === "proponentes" ? (
            <section className="dashboard">
              <div className="card editor-card">
                <h3>Selecionar proponentes atendidos (base Transferegov)</h3>
                <div className="filters-grid columns-4">
                  <label>
                    Buscar proponente
                    <input
                      value={proponenteCadastro.busca}
                      onChange={(e) =>
                        setProponenteCadastro((prev) => ({
                          ...prev,
                          busca: e.target.value
                        }))
                      }
                      placeholder="Nome ou CNPJ"
                    />
                  </label>
                  <label>
                    Selecione o proponente
                    <select
                      value={proponenteCadastro.cnpj_selecionado}
                      onChange={(e) =>
                        setProponenteCadastro((prev) => ({
                          ...prev,
                          cnpj_selecionado: e.target.value
                        }))
                      }
                      disabled={proponenteSugestoes.length === 0}
                    >
                      <option value="">Selecione</option>
                      {proponenteSugestoes.map((item) => (
                        <option key={`${item.cnpj}-${item.nome_proponente}`} value={item.cnpj}>
                          {item.nome_proponente} ({formatCnpj(item.cnpj)})
                          {item.cidade || item.uf ? ` - ${item.cidade ?? ""}${item.cidade && item.uf ? "/" : ""}${item.uf ?? ""}` : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="action-row">
                  <button
                    type="button"
                    onClick={() => void onSearchProponenteSugestoes()}
                    disabled={isLoadingProponenteSugestoes || isBusy}
                  >
                    {isLoadingProponenteSugestoes ? "Buscando..." : "Buscar na base"}
                  </button>
                  {canManageInstruments && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void onAddProponenteAtendido()}
                      disabled={isBusy || proponenteCadastro.cnpj_selecionado.trim() === ""}
                    >
                      Adicionar proponente atendido
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setProponenteCadastro(emptyProponenteCadastroState());
                      setProponenteSugestoes([]);
                    }}
                    disabled={isBusy || isLoadingProponenteSugestoes}
                  >
                    Limpar busca
                  </button>
                  {canManageInstruments && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void onReimportTodosProponentesInstrumentos()}
                      disabled={isBusy}
                    >
                      Sincronizar todos atendidos
                    </button>
                  )}
                </div>
              </div>

              <div className="card table-card">
                <h3>Lista de proponentes atendidos</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>NOME</th>
                        <th>CNPJ</th>
                        <th>CIDADE/UF</th>
                        <th>ACOES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proponentes.length === 0 ? (
                        <tr>
                          <td colSpan={5}>Nenhum proponente selecionado.</td>
                        </tr>
                      ) : (
                        proponentes.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>{item.nome}</td>
                            <td>{formatCnpj(item.cnpj)}</td>
                            <td>{item.cidade}/{item.uf}</td>
                            <td>
                              <div className="action-row compact">
                                {canManageInstruments && (
                                  <button
                                    type="button"
                                    className="secondary"
                                    onClick={() => void onReimportProponenteInstrumentos(item)}
                                    disabled={isBusy}
                                  >
                                    Reimportar instrumentos
                                  </button>
                                )}
                                {canDeactivateInstruments && (
                                  <button type="button" className="danger" onClick={() => void onDeleteProponente(item.id)}>
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
            <section className="dashboard ticket-helpdesk-view">
              <div className="ticket-helpdesk-shell">
                <aside className="card ticket-helpdesk-nav">
                  <p className="eyebrow">Help Desk</p>
                  <h3>Central de Tickets</h3>
                  <p className="subtitle">Fila operacional para triagem, acompanhamento e resolucao.</p>

                  <div className="ticket-helpdesk-board-menu">
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

                  <div className="ticket-helpdesk-kpis">
                    <article>
                      <span>Total no painel</span>
                      <strong>{visibleTickets.length}</strong>
                    </article>
                    <article>
                      <span>Alta/Critica</span>
                      <strong>{visibleTickets.filter((item) => item.prioridade === "ALTA" || item.prioridade === "CRITICA").length}</strong>
                    </article>
                    <article>
                      <span>Atrasados</span>
                      <strong>
                        {
                          visibleTickets.filter((item) =>
                            item.prazo_alvo && (item.status === "ABERTO" || item.status === "EM_ANDAMENTO")
                              ? new Date(`${item.prazo_alvo}T00:00:00.000Z`) < new Date(new Date().toISOString().slice(0, 10) + "T00:00:00.000Z")
                              : false
                          ).length
                        }
                      </strong>
                    </article>
                  </div>

                  <div className="ticket-helpdesk-nav-actions">
                    <button type="button" className="secondary" onClick={() => refreshData()} disabled={isBusy}>
                      Atualizar fila
                    </button>
                    {canManageInstruments && (
                      <button
                        type="button"
                        onClick={() => setShowTicketCreateModal(true)}
                      >
                        Criar novo ticket
                      </button>
                    )}
                  </div>
                </aside>

                <div className="ticket-helpdesk-main">
                  <div className="card ticket-helpdesk-toolbar">
                    <div className="ticket-helpdesk-toolbar-head">
                      <h3>
                        {ticketBoardTab === "abertos"
                          ? `Tickets em aberto (${openTickets.length})`
                          : ticketBoardTab === "resolvidos"
                            ? `Tickets resolvidos (${resolvedTickets.length})`
                            : `Tickets cancelados (${canceledTickets.length})`}
                      </h3>
                      <p className="subtitle">Visao tabular inspirada em helpdesk para operacao diaria.</p>
                    </div>

                    <div className="ticket-helpdesk-filters filters-grid columns-5">
                      <label>
                        Busca livre
                        <input
                          value={ticketFilters.q}
                          onChange={(e) => setTicketFilters((prev) => ({ ...prev, q: e.target.value }))}
                          placeholder="Codigo, titulo, descricao"
                        />
                      </label>
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
                      <label>
                        Instrumento
                        <select
                          value={ticketFilters.instrument_id}
                          onChange={(e) => setTicketFilters((prev) => ({ ...prev, instrument_id: e.target.value }))}
                        >
                          <option value="">Todos</option>
                          {sortedInstruments.map((item) => (
                            <option key={item.id} value={String(item.id)}>
                              {summarizeText(`${item.instrumento} | proposta ${item.proposta}`, 36)}
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
                    </div>

                    <div className="ticket-helpdesk-actions action-row">
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

                  {showTicketCreateModal && canManageInstruments && (
                    <div className="stage-followup-modal-overlay" onClick={() => setShowTicketCreateModal(false)}>
                      <div className="stage-followup-modal ticket-create-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="stage-followup-modal-head">
                          <h5>Abrir ticket manual</h5>
                          <button type="button" className="ghost compact-link" onClick={() => setShowTicketCreateModal(false)}>
                            Fechar
                          </button>
                        </div>
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
                                    {summarizeText(`${item.instrumento} | proposta ${item.proposta}`, 44)}
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
                    </div>
                  )}

                  {!selectedTicket ? (
                    <div className="tickets-layout ticket-list-layout">
                      <div className="card table-card ticket-grid-card">
                        {visibleTickets.length === 0 ? (
                          <p>Nenhum ticket encontrado.</p>
                        ) : (
                          <div className="ticket-grid-wrap">
                            <table className="ticket-grid-table">
                              <thead>
                              <tr>
                                <th>Tracking ID</th>
                                <th>Atualizado</th>
                                <th>Solicitante</th>
                                <th>Assunto</th>
                                <th>Status</th>
                                <th>Atribuido</th>
                                <th>Prioridade</th>
                                <th>Prazo alvo</th>
                                <th>SLA</th>
                              </tr>
                            </thead>
                              <tbody>
                                {visibleTickets.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="ticket-row"
                                    onClick={() => onSelectTicket(item.id)}
                                  >
                                    <td>
                                      <button type="button" className="ticket-row-link" onClick={() => onSelectTicket(item.id)}>
                                        {item.codigo}
                                      </button>
                                    </td>
                                    <td>
                                      <div className="ticket-row-subject">
                                        <strong>{new Date(item.updated_at).toLocaleString("pt-BR")}</strong>
                                        <span>{formatRelativeTimeFromIso(item.updated_at)}</span>
                                      </div>
                                    </td>
                                    <td>{item.criado_por.nome}</td>
                                    <td>
                                      <div className="ticket-row-subject">
                                        <strong>{item.titulo}</strong>
                                        <span>{formatTicketInstrumentLabel(item)}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className={`ticket-status-chip ${item.status.toLowerCase()}`}>
                                        {TICKET_STATUS_LABELS[item.status]}
                                      </span>
                                    </td>
                                    <td>{item.responsavel?.nome ?? "Nao atribuido"}</td>
                                    <td>
                                      <span className={`ticket-priority-chip ${item.prioridade.toLowerCase()}`}>
                                        {TICKET_PRIORITY_LABELS[item.prioridade]}
                                      </span>
                                    </td>
                                    <td>{item.prazo_alvo ? formatDateOnlyPtBr(item.prazo_alvo) : "Nao definido"}</td>
                                    <td>{formatTicketSla(item)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="card table-card ticket-detail-card ticket-detail-page">
                      <div className="ticket-detail-page-head">
                        <button type="button" className="ghost" onClick={onCloseTicketDetail}>
                          Voltar para fila
                        </button>
                        <p className="subtitle">Detalhes completos do ticket selecionado.</p>
                      </div>
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
                        {(!selectedTicket.instrumento || !selectedTicket.instrumento_encontrado) && selectedTicket.origem === "EMAIL" && (
                          <div className="ticket-instrument-warning">
                            <span className="warning-icon">⚠️</span>
                            <div>
                              <strong>Instrumento não identificado automaticamente</strong>
                              {selectedTicket.instrumento_informado && (
                                <p className="subtitle">Texto identificado: {selectedTicket.instrumento_informado}</p>
                              )}
                            </div>
                          </div>
                        )}
                        <p>
                          <strong>Instrumento:</strong>{" "}
                          {formatTicketInstrumentLabel(selectedTicket, "Nao informado")}
                        </p>
                        {!selectedTicket.instrumento && canManageInstruments && (
                          <div className="ticket-instrument-associate">
                            <label>
                              Buscar instrumento para associar:
                              <input
                                type="text"
                                value={ticketInstrumentSearch}
                                onChange={(e) => onSearchTicketInstrument(e.target.value)}
                                placeholder="Digite proposta, instrumento ou objeto..."
                              />
                            </label>
                            {ticketInstrumentSearching && <p className="subtitle">Buscando...</p>}
                            {ticketInstrumentResults.length > 0 && (
                              <div className="ticket-instrument-results">
                                {ticketInstrumentResults.map((inst) => (
                                  <button
                                    key={inst.id}
                                    type="button"
                                    className="instrument-result-item"
                                    onClick={() => onAssociateTicketInstrument(inst.id)}
                                    disabled={isBusy}
                                  >
                                    <strong>{inst.proposta || inst.instrumento || `#${inst.id}`}</strong>
                                    <span className="subtitle">{inst.objeto}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <p>
                          <strong>Responsavel:</strong> {selectedTicket.responsavel?.nome ?? "Nao atribuido"}
                        </p>
                        <div className="ticket-description-block">
                          <strong>Descricao:</strong>
                          <div className="ticket-description-text">{selectedTicket.descricao ?? "Sem descricao"}</div>
                        </div>
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

                      {selectedTicket.origem === "EMAIL" && selectedTicket.checklist_itens.length > 0 && (
                        <div className="ticket-email-pending-box">
                          <div className="ticket-email-pending-header">
                            <span className="ticket-email-pending-icon">✉️</span>
                            <div>
                              <h4 className="ticket-email-pending-title">Pendências identificadas via email</h4>
                              <p className="ticket-email-pending-subtitle">
                                {selectedTicket.checklist_itens.filter((i) => i.concluido).length} de{" "}
                                {selectedTicket.checklist_itens.length} pendência
                                {selectedTicket.checklist_itens.length !== 1 ? "s" : ""} concluída
                                {selectedTicket.checklist_itens.filter((i) => i.concluido).length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="ticket-email-pending-progress">
                            <div
                              className="ticket-email-pending-progress-bar"
                              style={{
                                width: `${
                                  selectedTicket.checklist_itens.length > 0
                                    ? Math.round(
                                        (selectedTicket.checklist_itens.filter((i) => i.concluido).length /
                                          selectedTicket.checklist_itens.length) *
                                          100
                                      )
                                    : 0
                                }%`
                              }}
                            />
                          </div>
                          <div className="ticket-checklist-list">
                            {selectedTicket.checklist_itens.map((item) => (
                              <label key={item.id} className="ticket-email-pending-item">
                                <input
                                  type="checkbox"
                                  checked={item.concluido}
                                  onChange={(e) =>
                                    onToggleTicketChecklistItem(selectedTicket.id, item.id, e.target.checked)
                                  }
                                  disabled={isBusy || !canManageInstruments}
                                />
                                <span className={item.concluido ? "done" : ""}>{item.descricao}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="ticket-checklist-box">
                        <h3>
                          Checklist ({selectedTicket.checklist_itens.filter((item) => item.concluido).length}/
                          {selectedTicket.checklist_itens.length})
                        </h3>
                        {selectedTicket.checklist_itens.length === 0 ? (
                          <p className="subtitle">Sem checklist neste ticket.</p>
                        ) : (
                          <div className="ticket-checklist-list">
                            {selectedTicket.checklist_itens.map((item) => (
                              <label key={item.id} className="ticket-checklist-item">
                                <input
                                  type="checkbox"
                                  checked={item.concluido}
                                  onChange={(e) =>
                                    onToggleTicketChecklistItem(selectedTicket.id, item.id, e.target.checked)
                                  }
                                  disabled={isBusy || !canManageInstruments}
                                />
                                <span className={item.concluido ? "done" : ""}>{item.descricao}</span>
                              </label>
                            ))}
                          </div>
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
                              const isActive = selectedTicket.status === status;
                              const colorClass = {
                                ABERTO: "ticket-status-btn-aberto",
                                EM_ANDAMENTO: "ticket-status-btn-andamento",
                                RESOLVIDO: "ticket-status-btn-resolvido",
                                CANCELADO: "ticket-status-btn-cancelado"
                              }[status];
                              return (
                                <button
                                  key={status}
                                  type="button"
                                  className={`ticket-status-btn ${colorClass}${isActive ? " active" : ""}`}
                                  onClick={() => onUpdateTicketStatus(selectedTicket.id, status)}
                                  disabled={isBusy || isActive || blockedByRole}
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
                        <h3>Acompanhamentos ({selectedTicket.comentarios.length})</h3>
                        {selectedTicket.comentarios.length === 0 ? (
                          <p className="subtitle">Nenhum acompanhamento registrado.</p>
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
                              placeholder="Adicionar acompanhamento"
                            />
                            <div className="action-row compact">
                              <button type="button" onClick={onAddTicketComment} disabled={isBusy}>
                                Registrar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
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
          ) : activeView === "assinaturas" ? (
            <section className="dashboard">
              {signatureTab === "certificados" && (
                <>
                  {isAdmin && (
                    <div className="card editor-card">
                      <h3>Cadastrar Certificado</h3>
                      <div className="form-grid">
                        <div className="filters-grid columns-3">
                          <label>
                            Nome *
                            <input
                              value={certificateForm.nome}
                              onChange={(e) => setCertificateForm((prev) => ({ ...prev, nome: e.target.value }))}
                              placeholder="Nome de identificacao"
                            />
                          </label>
                          <label>
                            Titular *
                            <input
                              value={certificateForm.titular}
                              onChange={(e) => setCertificateForm((prev) => ({ ...prev, titular: e.target.value }))}
                              placeholder="Nome do titular"
                            />
                          </label>
                          <label>
                            CPF *
                            <input
                              value={certificateForm.cpf}
                              onChange={(e) => setCertificateForm((prev) => ({ ...prev, cpf: e.target.value }))}
                              placeholder="CPF do titular"
                            />
                          </label>
                          <label>
                            Validade *
                            <input
                              type="date"
                              value={certificateForm.validade}
                              onChange={(e) => setCertificateForm((prev) => ({ ...prev, validade: e.target.value }))}
                            />
                          </label>
                          <label>
                            Arquivo (.pfx) *
                            <input
                              type="file"
                              accept=".pfx,.p12"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    const base64 = (reader.result as string).split(",")[1];
                                    setCertificateForm((prev) => ({ ...prev, arquivo: base64, arquivo_nome: file.name }));
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                          <label>
                            Senha do certificado *
                            <input
                              type="password"
                              value={certificateForm.senha}
                              onChange={(e) => setCertificateForm((prev) => ({ ...prev, senha: e.target.value }))}
                              placeholder="Senha do arquivo PFX"
                            />
                          </label>
                        </div>
                        <button type="button" onClick={onCreateCertificate} disabled={isBusy}>
                          Cadastrar Certificado
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="card table-card">
                    <h3>Certificados Cadastrados</h3>
                    {certificates.length === 0 ? (
                      <p>Nenhum certificado cadastrado.</p>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Nome</th>
                              <th>Titular</th>
                              <th>CPF</th>
                              <th>Validade</th>
                              <th>Status</th>
                              {isAdmin && <th>Acoes</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {certificates.map((cert) => (
                              <tr key={cert.id}>
                                <td>{cert.nome}</td>
                                <td>{cert.titular}</td>
                                <td>{cert.cpf}</td>
                                <td>{new Date(cert.validade).toLocaleDateString("pt-BR")}</td>
                                <td>
                                  <span className={`status-chip ${cert.status.toLowerCase()}`}>
                                    {cert.status}
                                  </span>
                                </td>
                                {isAdmin && (
                                  <td>
                                    <button
                                      type="button"
                                      className="ghost danger"
                                      onClick={() => onRevokeCertificate(cert.id)}
                                      disabled={isBusy || cert.status === "REVOGADO"}
                                    >
                                      Revogar
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {signatureTab === "documentos" && (
                <>
                  <div className="card editor-card">
                    <h3>Solicitar documentos por link</h3>
                    <div className="filters-grid columns-5">
                      <label>
                        Titulo *
                        <input
                          value={documentAiRequestForm.titulo}
                          onChange={(e) => setDocumentAiRequestForm((prev) => ({ ...prev, titulo: e.target.value }))}
                          placeholder="Ex.: Balancete do mes"
                        />
                      </label>
                      <label>
                        Prioridade
                        <select
                          value={documentAiRequestForm.prioridade}
                          onChange={(e) =>
                            setDocumentAiRequestForm((prev) => ({
                              ...prev,
                              prioridade: e.target.value as DocumentAiRequestPriority
                            }))
                          }
                        >
                          {DOCUMENT_REQUEST_PRIORITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {DOCUMENT_REQUEST_PRIORITY_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Prazo (opcional)
                        <input
                          type="date"
                          value={documentAiRequestForm.prazo}
                          onChange={(e) => setDocumentAiRequestForm((prev) => ({ ...prev, prazo: e.target.value }))}
                        />
                      </label>
                      <label>
                        Validade do link
                        <select
                          value={String(documentAiRequestForm.validadeDias)}
                          onChange={(e) =>
                            setDocumentAiRequestForm((prev) => ({
                              ...prev,
                              validadeDias: Number(e.target.value)
                            }))
                          }
                        >
                          {[1, 3, 7, 15, 30].map((option) => (
                            <option key={option} value={String(option)}>
                              {option} dia(s)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Filtro (texto)
                        <input
                          value={documentAiRequestFilterQuery}
                          onChange={(e) => setDocumentAiRequestFilterQuery(e.target.value)}
                          placeholder="Buscar solicitacoes"
                        />
                      </label>
                    </div>
                    <label>
                      Descricao
                      <textarea
                        rows={2}
                        value={documentAiRequestForm.descricao}
                        onChange={(e) => setDocumentAiRequestForm((prev) => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Orientacoes para quem vai enviar os PDFs"
                      />
                    </label>
                    <div className="action-row">
                      <button type="button" onClick={onCreateDocumentAiRequest} disabled={busyDocumentAiRequestId === -1}>
                        {busyDocumentAiRequestId === -1 ? "Criando..." : "Criar solicitacao"}
                      </button>
                      <label>
                        Status
                        <select
                          value={documentAiRequestFilterStatus}
                          onChange={(e) => setDocumentAiRequestFilterStatus(e.target.value as "" | DocumentAiRequestStatus)}
                        >
                          <option value="">Todos</option>
                          <option value="ABERTA">Aberta</option>
                          <option value="ATENDIDA">Atendida</option>
                          <option value="CANCELADA">Cancelada</option>
                        </select>
                      </label>
                      <label>
                        Prioridade
                        <select
                          value={documentAiRequestFilterPriority}
                          onChange={(e) =>
                            setDocumentAiRequestFilterPriority(e.target.value as "" | DocumentAiRequestPriority)
                          }
                        >
                          <option value="">Todas</option>
                          {DOCUMENT_REQUEST_PRIORITY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {DOCUMENT_REQUEST_PRIORITY_LABELS[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          onLoadDocumentAiRequests({
                            status: documentAiRequestFilterStatus,
                            prioridade: documentAiRequestFilterPriority,
                            q: documentAiRequestFilterQuery
                          })
                        }
                        disabled={isLoadingDocumentAiRequests}
                      >
                        {isLoadingDocumentAiRequests ? "Atualizando..." : "Aplicar filtros"}
                      </button>
                    </div>
                  </div>

                  <div className="card table-card">
                    <h3>Solicitacoes de documentos</h3>
                    {isLoadingDocumentAiRequests ? (
                      <p>Carregando solicitacoes...</p>
                    ) : documentAiRequests.length === 0 ? (
                      <p>Nenhuma solicitacao registrada.</p>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Titulo</th>
                              <th>Status</th>
                              <th>Prioridade</th>
                              <th>Prazo</th>
                              <th>Documentos</th>
                              <th>Link externo</th>
                              <th>Acoes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documentAiRequests.map((requestItem) => {
                              const isBusyRequest = busyDocumentAiRequestId === requestItem.id;
                              return (
                                <tr key={requestItem.id}>
                                  <td>
                                    <p>{normalizeReadableTextSafe(requestItem.titulo)}</p>
                                    {requestItem.descricao ? (
                                      <p className="subtitle">{normalizeReadableTextSafe(requestItem.descricao)}</p>
                                    ) : null}
                                  </td>
                                  <td>
                                    <span className={`status-chip ${requestItem.status.toLowerCase()}`}>
                                      {DOCUMENT_REQUEST_STATUS_LABELS[requestItem.status]}
                                    </span>
                                  </td>
                                  <td>{DOCUMENT_REQUEST_PRIORITY_LABELS[requestItem.prioridade]}</td>
                                  <td>{requestItem.prazo ? new Date(requestItem.prazo).toLocaleString("pt-BR") : "-"}</td>
                                  <td>
                                    <p>{requestItem.total_documentos}</p>
                                    {requestItem.documentos.length > 0 ? (
                                      <p className="subtitle">
                                        Ultimo: {normalizeReadableTextSafe(requestItem.documentos[0].arquivoNome)}
                                      </p>
                                    ) : null}
                                  </td>
                                  <td>
                                    {requestItem.solicitacao_externa ? (
                                      <>
                                        <input value={toAbsoluteUrl(requestItem.solicitacao_externa.link_publico)} readOnly />
                                        <p className="subtitle">
                                          Expira em {new Date(requestItem.solicitacao_externa.expira_em).toLocaleString("pt-BR")}
                                        </p>
                                      </>
                                    ) : (
                                      "Sem link ativo"
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="ghost"
                                      onClick={() => onGenerateDocumentAiRequestLink(requestItem.id)}
                                      disabled={isBusyRequest || requestItem.status === "CANCELADA"}
                                    >
                                      {isBusyRequest ? "Processando..." : requestItem.solicitacao_externa ? "Gerar novo link" : "Gerar link"}
                                    </button>
                                    {requestItem.solicitacao_externa && (
                                      <button
                                        type="button"
                                        className="ghost"
                                        onClick={() => onCopyDocumentAiRequestLink(requestItem.solicitacao_externa?.link_publico ?? "")}
                                        disabled={isBusyRequest}
                                      >
                                        Copiar link
                                      </button>
                                    )}
                                    {requestItem.solicitacao_externa && (
                                      <button
                                        type="button"
                                        className="danger"
                                        onClick={() => onDeactivateDocumentAiRequestLink(requestItem.id)}
                                        disabled={isBusyRequest}
                                      >
                                        Desativar link
                                      </button>
                                    )}
                                    {requestItem.status !== "CANCELADA" && requestItem.status !== "ATENDIDA" && (
                                      <button
                                        type="button"
                                        className="ghost danger"
                                        onClick={() => onCancelDocumentAiRequest(requestItem.id)}
                                        disabled={isBusyRequest}
                                      >
                                        Cancelar
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="card editor-card">
                    <h3>Carregar Documento para Assinatura</h3>
                    <div className="form-grid">
                      <div className="filters-grid columns-2">
                        <label>
                          Titulo *
                          <input
                            value={documentForm.titulo}
                            onChange={(e) => setDocumentForm((prev) => ({ ...prev, titulo: e.target.value }))}
                            placeholder="Nome do documento"
                          />
                        </label>
                        <label>
                          Descricao
                          <input
                            value={documentForm.descricao}
                            onChange={(e) => setDocumentForm((prev) => ({ ...prev, descricao: e.target.value }))}
                            placeholder="Descricao opcional"
                          />
                        </label>
                        <label>
                          Arquivo PDF *
                          <input
                            ref={documentUploadInputRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              setDocumentForm((prev) => ({
                                ...prev,
                                arquivo: file ?? null,
                                arquivo_nome: file?.name ?? ""
                              }));
                            }}
                          />
                          <small>{documentForm.arquivo ? `Selecionado: ${documentForm.arquivo.name}` : "Nenhum arquivo selecionado"}</small>
                        </label>
                      </div>
                      <button type="button" onClick={onCreateDocument} disabled={isUploadingDocument}>
                        {isUploadingDocument ? "Carregando..." : "Carregar Documento"}
                      </button>
                    </div>
                  </div>

                  <div className="card table-card">
                    <h3>Busca Inteligente de Documentos</h3>
                    <div className="filters-grid columns-4">
                      <label>
                        Buscar no conteudo
                        <input
                          value={documentSearchQuery}
                          onChange={(e) => setDocumentSearchQuery(e.target.value)}
                          placeholder="Ex.: declaracao de titularidade"
                        />
                      </label>
                      <label>
                        Status
                        <select
                          value={documentSearchStatus}
                          onChange={(e) => setDocumentSearchStatus(e.target.value as "" | "PENDENTE" | "ASSINADO" | "CANCELADO")}
                        >
                          <option value="">Todos</option>
                          <option value="PENDENTE">Pendente</option>
                          <option value="ASSINADO">Assinado</option>
                          <option value="CANCELADO">Cancelado</option>
                        </select>
                      </label>
                      <label>
                        Data de
                        <input
                          type="date"
                          value={documentSearchDataDe}
                          onChange={(e) => setDocumentSearchDataDe(e.target.value)}
                        />
                      </label>
                      <label>
                        Data ate
                        <input
                          type="date"
                          value={documentSearchDataAte}
                          onChange={(e) => setDocumentSearchDataAte(e.target.value)}
                        />
                      </label>
                    </div>
                    <div className="action-row">
                      <button type="button" onClick={onSearchDocuments} disabled={isSearchingDocuments}>
                        {isSearchingDocuments ? "Pesquisando..." : `Buscar ${documentSearchSemantic ? "Semantica IA" : "Lexical"}`}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setDocumentSearchSemantic((prev) => !prev)}
                        disabled={isSearchingDocuments}
                      >
                        {documentSearchSemantic ? "Modo semantico ativo" : "Modo lexical ativo"}
                      </button>
                    </div>

                    {documentSearchResults.length > 0 && (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Titulo</th>
                              <th>Trecho encontrado</th>
                              <th>Tipo</th>
                              <th>Score</th>
                              <th>Indexacao</th>
                              <th>Categoria IA</th>
                              <th>Risco IA</th>
                              <th>Resumo IA</th>
                              <th>Acoes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documentSearchResults.map((result) => (
                              <tr key={`search-${result.id}`}>
                                <td>{normalizeReadableTextSafe(result.titulo)}</td>
                                <td>{normalizeReadableTextSafe(result.snippet)}</td>
                                <td>{result.searchType === "semantic" ? "Semantica" : "Lexical"}</td>
                                <td>{result.score}</td>
                                <td>{DOCUMENT_INDEX_STATUS_LABELS[result.indexStatus]}</td>
                                <td>{result.aiCategory ? DOCUMENT_AI_CATEGORY_LABELS[result.aiCategory] : "-"}</td>
                                <td>{result.aiRiskLevel ? DOCUMENT_AI_RISK_LABELS[result.aiRiskLevel] : "-"}</td>
                                <td>{normalizeReadableTextSafe(result.aiSummary)}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="button ghost"
                                    onClick={() => onDownloadDocument(result.id, result.arquivoNome)}
                                  >
                                    Baixar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="card table-card">
                    <h3>Documentos</h3>
                    {documents.length === 0 ? (
                      <p>Nenhum documento carregado.</p>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Titulo</th>
                              <th>Arquivo</th>
                              <th>Status</th>
                              <th>Indexacao</th>
                              <th>Classificacao IA</th>
                              <th>Data</th>
                              <th>Acoes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {documents.map((doc) => (
                              <tr key={doc.id}>
                                <td>{normalizeReadableTextSafe(doc.titulo)}</td>
                                <td>{normalizeReadableTextSafe(doc.arquivoNome)}</td>
                                <td>
                                  <span className={`status-chip ${doc.status.toLowerCase()}`}>
                                    {doc.status === "PENDENTE" ? "Pendente" : doc.status === "ASSINADO" ? "Assinado" : "Cancelado"}
                                  </span>
                                </td>
                                <td>
                                  <span className={`status-chip ${(doc.indexStatus ?? "PENDENTE").toLowerCase()}`}>
                                    {DOCUMENT_INDEX_STATUS_LABELS[(doc.indexStatus ?? "PENDENTE") as "PENDENTE" | "PROCESSANDO" | "INDEXADO" | "ERRO"]}
                                  </span>
                                  {doc.indexError ? <p className="subtitle">{doc.indexError}</p> : null}
                                </td>
                                <td>
                                  <p>
                                    {doc.aiCategory ? DOCUMENT_AI_CATEGORY_LABELS[doc.aiCategory as "CONTRATO" | "OFICIO" | "RELATORIO" | "PRESTACAO_CONTAS" | "COMPROVANTE" | "OUTROS"] : "Nao classificado"}
                                  </p>
                                  <p className="subtitle">
                                    {doc.aiRiskLevel
                                      ? `Risco ${DOCUMENT_AI_RISK_LABELS[doc.aiRiskLevel as "BAIXO" | "MEDIO" | "ALTO" | "CRITICO"]}${typeof doc.aiClassificationConfidence === "number" ? ` (${Math.round(doc.aiClassificationConfidence * 100)}%)` : ""}`
                                      : "-"}
                                  </p>
                                  {doc.aiInsights ? (
                                    <p className="subtitle">{normalizeReadableTextSafe(doc.aiInsights)}</p>
                                  ) : null}
                                </td>
                                <td>{new Date(doc.createdAt).toLocaleString("pt-BR")}</td>
                                <td>
                                  {doc.status === "PENDENTE" && (
                                    <button type="button" className="primary" onClick={() => onOpenSignModal(doc.id)}>
                                      Assinar
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="button ghost"
                                    onClick={() => onDownloadDocument(doc.id, doc.arquivoNome)}
                                  >
                                    Baixar
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost danger"
                                    onClick={() => onDeleteDocument(doc.id, doc.status)}
                                    disabled={deletingDocumentId === doc.id}
                                  >
                                    Excluir
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => onReindexDocument(doc.id)}
                                    disabled={reindexingDocumentId === doc.id}
                                  >
                                    {reindexingDocumentId === doc.id ? "Reindexando..." : "Reindexar"}
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => onOpenDocumentQa(doc.id, normalizeReadableTextSafe(doc.titulo, doc.titulo))}
                                  >
                                    Perguntar IA
                                  </button>
                                  <button
                                    type="button"
                                    className="ghost"
                                    onClick={() => onClassifyDocument(doc.id)}
                                    disabled={classifyingDocumentId === doc.id}
                                  >
                                    {classifyingDocumentId === doc.id ? "Classificando..." : "Classificar IA"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}

              {showSignModal && (
                <div className="stage-followup-modal-overlay" onClick={() => setShowSignModal(false)}>
                  <div className="stage-followup-modal" onClick={(event) => event.stopPropagation()}>
                    <div className="stage-followup-modal-head">
                      <h5>Assinar Documento</h5>
                      <button type="button" className="ghost compact-link" onClick={() => setShowSignModal(false)}>
                        Fechar
                      </button>
                    </div>
                    <div className="filters-grid columns-1">
                      <label>
                        Selecione o Certificado
                        <select
                          value={signCertificateId ?? ""}
                          onChange={(e) => setSignCertificateId(Number(e.target.value))}
                        >
                          <option value="">Selecione...</option>
                          {activeCertificates.map((cert) => (
                            <option key={cert.id} value={cert.id}>
                              {cert.nome} - {cert.titular} (CPF: {cert.cpf})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Senha do Certificado
                        <input
                          type="password"
                          value={signPassword}
                          onChange={(e) => setSignPassword(e.target.value)}
                          placeholder="Digite a senha do certificado"
                        />
                      </label>
                    </div>
                    <div className="action-row compact">
                      <button type="button" className="primary" onClick={onSignDocument} disabled={isBusy || !signCertificateId || !signPassword}>
                        Assinar Documento
                      </button>
                      <button type="button" className="ghost" onClick={() => setShowSignModal(false)} disabled={isBusy}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {qaDocumentId !== null && (
                <div className="stage-followup-modal-overlay" onClick={() => setQaDocumentId(null)}>
                  <div className="stage-followup-modal" onClick={(event) => event.stopPropagation()}>
                    <div className="stage-followup-modal-head">
                      <h5>Perguntar IA: {qaDocumentTitle}</h5>
                      <button type="button" className="ghost compact-link" onClick={() => setQaDocumentId(null)}>
                        Fechar
                      </button>
                    </div>
                    <div className="form-grid">
                      <label>
                        Pergunta
                        <textarea
                          rows={3}
                          value={qaQuestion}
                          onChange={(e) => setQaQuestion(e.target.value)}
                          placeholder="Ex.: Qual o objeto, prazo e obrigacoes principais deste documento?"
                        />
                      </label>
                      <div className="action-row compact">
                        <button type="button" onClick={onAskDocumentQuestion} disabled={isAskingDocument}>
                          {isAskingDocument ? "Consultando IA..." : "Perguntar"}
                        </button>
                      </div>
                      {qaAnswer && (
                        <div className="card">
                          <h3>Resposta</h3>
                          <p>{qaAnswer}</p>
                          {qaSources.length > 0 && (
                            <>
                              <h3>Fontes usadas</h3>
                              <ul>
                                {qaSources.map((source) => (
                                  <li key={`qa-source-${source.chunkIndex}`}>
                                    Trecho {source.chunkIndex} (score {source.score}): {source.snippet}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : activeView === "assistente" ? (
            <section className="dashboard">
              <div className="card">
                <h3>Assistente 360</h3>
                <p className="subtitle">
                  Chat operacional do Gestconv360 para consultas em linguagem natural sobre dados internos.
                </p>
              </div>

              <div className="card table-card">
                <h3>Conversa</h3>
                <div className="assistant-chat-log" ref={assistenteChatLogRef}>
                  {assistenteConversa.map((item) => (
                    <article
                      key={item.id}
                      className={`assistant-chat-message ${item.role === "assistant" ? "assistant" : "user"}`}
                    >
                      <div className={`assistant-chat-meta ${item.role === "assistant" ? "assistant" : "user"}`}>
                        <span className="assistant-chat-avatar" aria-hidden="true">
                          {item.role === "assistant" ? "🤖" : "👤"}
                        </span>
                        <p className="eyebrow">{item.role === "assistant" ? "Assistente 360" : "Voce"}</p>
                        {item.role === "assistant" && item.contextoUsado ? (
                          <span
                            className="assistant-context-badge"
                            title={
                              item.perguntaInterpretada
                                ? `Pergunta interpretada: ${item.perguntaInterpretada}`
                                : "Resposta usando contexto da conversa"
                            }
                          >
                            Contexto ativo
                          </span>
                        ) : null}
                      </div>
                      <p>
                        {item.text}
                        {isConsultandoAssistente && assistenteTypingMessageId === item.id ? (
                          <span className="assistant-typing-cursor" aria-hidden="true">
                            |
                          </span>
                        ) : null}
                      </p>
                      <p className="assistant-chat-time">{formatChatTime(item.createdAt)}</p>
                    </article>
                  ))}
                  {isConsultandoAssistente && (
                    <article className="assistant-chat-message assistant assistant-chat-typing">
                      <div className="assistant-chat-meta assistant">
                        <span className="assistant-chat-avatar" aria-hidden="true">
                          🤖
                        </span>
                        <p className="eyebrow">Assistente 360</p>
                      </div>
                      <p>
                        Digitando<span className="assistant-typing-dots">...</span>
                      </p>
                    </article>
                  )}
                </div>

                <div className="assistant-chat-form">
                  <label>
                    Pergunta
                    <textarea
                      rows={3}
                      value={assistentePergunta}
                      onChange={(e) => setAssistentePergunta(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!isConsultandoAssistente && !isBusy) {
                            void onAskAssistente();
                          }
                        }
                      }}
                      placeholder="Ex.: Qual valor de desembolso ja foi feito para a cidade de Parnamirim?"
                    />
                  </label>
                  <div className="action-row">
                    <button type="button" onClick={() => void onAskAssistente()} disabled={isConsultandoAssistente || isBusy}>
                      {isConsultandoAssistente ? "Consultando..." : "Perguntar"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setAssistenteConversa(emptyAssistenteConversa());
                        setAssistentePergunta("");
                      }}
                      disabled={isConsultandoAssistente}
                    >
                      Limpar conversa
                    </button>
                  </div>
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
                <button
                  type="button"
                  className={relatorioTab === "tickets" ? "tab active" : "tab"}
                  onClick={() => setRelatorioTab("tickets")}
                >
                  Tickets
                </button>
                <button
                  type="button"
                  className={relatorioTab === "transferencias_especiais" ? "tab active" : "tab"}
                  onClick={() => setRelatorioTab("transferencias_especiais")}
                >
                  Transf. Especiais
                </button>
                <button
                  type="button"
                  className={relatorioTab === "transferencias_discricionarias" ? "tab active" : "tab"}
                  onClick={() => setRelatorioTab("transferencias_discricionarias")}
                >
                  Transf. Discricionarias
                </button>
                <button
                  type="button"
                  className={relatorioTab === "fns_repasses" ? "tab active" : "tab"}
                  onClick={() => setRelatorioTab("fns_repasses")}
                >
                  FNS Repasses
                </button>
                <button
                  type="button"
                  className={relatorioTab === "consultafns_propostas" ? "tab active" : "tab"}
                  onClick={() => setRelatorioTab("consultafns_propostas")}
                >
                  Consulta FNS
                </button>
                <button
                  type="button"
                  className={relatorioTab === "simec_obras" ? "tab active" : "tab"}
                  onClick={() => setRelatorioTab("simec_obras")}
                >
                  SIMEC Obras
                </button>
              </div>

              {relatorioTab === "repasses" ? (
              <>
              <div className="card filters-card">
                <h3>Relatorio de repasses por proponente</h3>
                <div className="filters-grid columns-4">
                  <label>
                    Proponente *
                    <select
                      value={reportFilters.proponente_id}
                      onChange={(e) =>
                        setReportFilters((prev) => ({
                          ...prev,
                          proponente_id: e.target.value,
                          instrumento_id: ""
                        }))
                      }
                    >
                      <option value="">Selecione</option>
                      {proponentes.map((item) => (
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
              ) : relatorioTab === "obras" ? (
                <>
                  <div className="card filters-card">
                    <h3>Relatorio de acompanhamento de obras</h3>
                    <div className="filters-grid columns-4">
                      <label>
                        Proponente
                        <select
                          value={obraReportFilters.proponente_id}
                          onChange={(e) =>
                            setObraReportFilters((prev) => ({
                              ...prev,
                              proponente_id: e.target.value,
                              instrumento_id: ""
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          {proponentes.map((item) => (
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
              ) : relatorioTab === "fns_repasses" ? (
                <>
                  <div className="card filters-card">
                    <h3>Repasses FNS para municipios (InvestSUS)</h3>
                    <div className="filters-grid columns-4">
                      <label>
                        Ano
                        <input
                          type="number"
                          min={2000}
                          max={2100}
                          value={fnsRepassesFilters.ano}
                          onChange={(e) => setFnsRepassesFilters((prev) => ({ ...prev, ano: e.target.value }))}
                          placeholder="Ex.: 2025"
                        />
                      </label>
                      <label>
                        UF
                        <select
                          value={fnsRepassesFilters.uf_id}
                          onChange={(e) =>
                            setFnsRepassesFilters((prev) => ({
                              ...prev,
                              uf_id: e.target.value,
                              co_ibge_municipio: "",
                              cnpj: ""
                            }))
                          }
                        >
                          <option value="">Selecione</option>
                          {fnsUfs.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.sigla} - {item.nomeAcentuado}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Municipio (IBGE)
                        <select
                          value={fnsRepassesFilters.co_ibge_municipio}
                          onChange={(e) =>
                            setFnsRepassesFilters((prev) => ({
                              ...prev,
                              co_ibge_municipio: e.target.value,
                              cnpj: ""
                            }))
                          }
                          disabled={fnsMunicipios.length === 0}
                        >
                          <option value="">Selecione</option>
                          {fnsMunicipios.map((item) => (
                            <option key={item.codigo} value={item.codigo}>
                              {item.descricao} ({item.codigo})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Entidade / CNPJ
                        <select
                          value={fnsRepassesFilters.cnpj}
                          onChange={(e) => setFnsRepassesFilters((prev) => ({ ...prev, cnpj: e.target.value }))}
                          disabled={fnsEntidades.length === 0}
                        >
                          <option value="">Selecione</option>
                          {fnsEntidades.map((item) => (
                            <option key={`${item.cnpj}-${item.nome}`} value={item.cnpj}>
                              {item.nome} ({formatCnpj(item.cnpj)})
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        CNPJ manual
                        <input
                          value={fnsRepassesFilters.cnpj}
                          onChange={(e) =>
                            setFnsRepassesFilters((prev) => ({
                              ...prev,
                              cnpj: formatCnpj(e.target.value.replace(/\D/g, ""))
                            }))
                          }
                          placeholder="00.000.000/0000-00"
                        />
                      </label>
                      <label>
                        Codigo bloco (detalhe)
                        <input
                          value={fnsRepassesFilters.codigo_bloco}
                          onChange={(e) => setFnsRepassesFilters((prev) => ({ ...prev, codigo_bloco: e.target.value }))}
                          placeholder="Ex.: 10"
                        />
                      </label>
                    </div>

                    <div className="action-row">
                      <button type="button" onClick={() => void onApplyFnsRepassesFilters()} disabled={isBusy}>
                        Consultar
                      </button>
                      <button type="button" className="secondary" onClick={onClearFnsRepassesFilters} disabled={isBusy}>
                        Limpar filtros
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void loadFnsSyncStatus()}
                        disabled={isBusy}
                      >
                        Atualizar status
                      </button>
                      {canManageInstruments && (
                        <button type="button" className="secondary" onClick={() => void onSyncFnsCache()} disabled={isBusy}>
                          Sincronizar cache FNS
                        </button>
                      )}
                    </div>
                  </div>

                  {fnsSyncStatus && (
                    <div className="card table-card">
                      <p>
                        Status cache: {fnsSyncStatus.status} | Atualizado em: {fnsSyncStatus.atualizado_em ?? "-"} | Entradas: {" "}
                        {fnsSyncStatus.entradas_cache} | Falhas: {fnsSyncStatus.falhas}
                      </p>
                      {fnsSyncStatus.detalhe && <p className="muted">{fnsSyncStatus.detalhe}</p>}
                    </div>
                  )}

                  {!fnsRepassesData ? (
                    <div className="card table-card">
                      <p>Selecione um CNPJ e clique em consultar para carregar repasses e saldos do FNS.</p>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Blocos com repasse</p>
                          <h3>{fnsRepassesData.quantidade}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Total repassado</p>
                          <h3>{formatCurrency(fnsRepassesData.valor)}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Tipos de conta</p>
                          <h3>{fnsSaldosData?.quantidade ?? 0}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Saldo total</p>
                          <h3>{formatCurrency(fnsSaldosData?.valor ?? 0)}</h3>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Repasses por bloco</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Codigo</th>
                                <th>Bloco</th>
                                <th>Valor repassado</th>
                                <th>Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fnsRepassesData.itens.length === 0 ? (
                                <tr>
                                  <td colSpan={4}>Nenhum repasse encontrado para os filtros informados.</td>
                                </tr>
                              ) : (
                                fnsRepassesData.itens.map((item) => (
                                  <tr key={`${item.codigoBloco}-${item.nomeBloco}`}>
                                    <td>{item.codigoBloco}</td>
                                    <td>{item.nomeBloco}</td>
                                    <td>{formatCurrency(item.valorRepassado)}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="secondary"
                                        onClick={() => void onLoadFnsDetalheBloco(item.codigoBloco, item.nomeBloco)}
                                        disabled={isBusy}
                                      >
                                        Ver detalhe
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {fnsSaldosData && (
                        <div className="card table-card">
                          <h3>Saldos por tipo de conta</h3>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>ID</th>
                                  <th>Sigla</th>
                                  <th>Descricao</th>
                                  <th>Valor saldo</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fnsSaldosData.itens.length === 0 ? (
                                  <tr>
                                    <td colSpan={4}>Nenhum saldo encontrado.</td>
                                  </tr>
                                ) : (
                                  fnsSaldosData.itens.map((item) => (
                                    <tr key={`${item.idTipoConta}-${item.sigla}`}>
                                      <td>{item.idTipoConta}</td>
                                      <td>{item.sigla}</td>
                                      <td>{item.descricao}</td>
                                      <td>{formatCurrency(item.valorSaldo)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {fnsRepassesDetalheData && (
                        <div className="card table-card">
                          <h3>Detalhe de repasses ({fnsDetalheBlocoLabel || "bloco selecionado"})</h3>
                          <p className="muted" style={{ marginTop: 0 }}>
                            Registros: {fnsRepassesDetalheData.quantidade} | Valor: {formatCurrency(fnsRepassesDetalheData.valor)}
                          </p>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Competencia</th>
                                  <th>Grupo</th>
                                  <th>Processo</th>
                                  <th>OB</th>
                                  <th>Data OB</th>
                                  <th>Banco/Ag/Conta</th>
                                  <th>Acao</th>
                                  <th>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {fnsRepassesDetalheData.itens.length === 0 ? (
                                  <tr>
                                    <td colSpan={8}>Nenhum detalhe encontrado para o bloco selecionado.</td>
                                  </tr>
                                ) : (
                                  fnsRepassesDetalheData.itens.map((item, index) => (
                                    <tr key={`${item.numeroOB ?? "ob"}-${index}`}>
                                      <td>{item.descricaoCompetencia ?? item.descricaoTipoCompetencia ?? "-"}</td>
                                      <td>{item.nomeGrupo ?? "-"}</td>
                                      <td>{item.numeroProcesso ?? "-"}</td>
                                      <td>{item.numeroOB ?? "-"}</td>
                                      <td>{item.dataOB ? item.dataOB.slice(0, 10) : "-"}</td>
                                      <td>{`${item.codigoBanco ?? "-"} / ${item.numeroAgencia ?? "-"} / ${item.numeroConta ?? "-"}`}</td>
                                      <td>{normalizeReadableText(item.nomeAcao ?? null) ?? "-"}</td>
                                      <td>{formatCurrency(item.valorRepassado ?? 0)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : relatorioTab === "consultafns_propostas" ? (
                <>
                  <div className="card filters-card">
                    <h3>Consulta FNS - Propostas</h3>
                    <div className="filters-grid columns-4">
                      <label>
                        Ano
                        <select
                          value={consultaFnsFilters.ano}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, ano: e.target.value }))}
                        >
                          <option value="">Todos</option>
                          {consultaFnsAnos.map((item) => (
                            <option key={item.valor} value={item.valor}>
                              {item.descricao}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        UF
                        <select
                          value={consultaFnsFilters.uf}
                          onChange={(e) =>
                            setConsultaFnsFilters((prev) => ({
                              ...prev,
                              uf: e.target.value,
                              co_municipio_ibge: ""
                            }))
                          }
                        >
                          <option value="">Todas</option>
                          {consultaFnsUfs.map((item) => (
                            <option key={item.id} value={item.sigla}>
                              {item.sigla} - {item.nome}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Municipio
                        <select
                          value={consultaFnsFilters.co_municipio_ibge}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, co_municipio_ibge: e.target.value }))}
                          disabled={consultaFnsMunicipios.length === 0}
                        >
                          <option value="">Todos</option>
                          {consultaFnsMunicipios.map((item) => (
                            <option key={item.coMunicipioIbge} value={item.coMunicipioIbge}>
                              {item.noMunicipio}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        N° proposta
                        <input
                          value={consultaFnsFilters.nu_proposta}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, nu_proposta: e.target.value }))}
                          placeholder="Ex.: 00394700000114008"
                        />
                      </label>
                      <label>
                        Tipo proposta
                        <input
                          value={consultaFnsFilters.tp_proposta}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, tp_proposta: e.target.value }))}
                          placeholder="Ex.: EQUIPAMENTO"
                        />
                      </label>
                      <label>
                        Tipo recurso
                        <input
                          value={consultaFnsFilters.tp_recurso}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, tp_recurso: e.target.value }))}
                          placeholder="Ex.: EMENDA"
                        />
                      </label>
                      <label>
                        Tipo emenda
                        <input
                          value={consultaFnsFilters.tp_emenda}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, tp_emenda: e.target.value }))}
                          placeholder="Ex.: INDIVIDUAL"
                        />
                      </label>
                      <label>
                        Tamanho da pagina
                        <select
                          value={consultaFnsFilters.count}
                          onChange={(e) => setConsultaFnsFilters((prev) => ({ ...prev, count: e.target.value }))}
                        >
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </label>
                    </div>
                    <div className="action-row">
                      <button type="button" onClick={() => void onApplyConsultaFnsFilters(1)} disabled={isBusy}>
                        Consultar
                      </button>
                      <button type="button" className="secondary" onClick={onClearConsultaFnsFilters} disabled={isBusy}>
                        Limpar filtros
                      </button>
                      <button type="button" className="secondary" onClick={() => void loadConsultaFnsStatus()} disabled={isBusy}>
                        Atualizar status
                      </button>
                      {canManageInstruments && (
                        <button type="button" className="secondary" onClick={() => void onSyncConsultaFnsCache()} disabled={isBusy}>
                          Sincronizar cache
                        </button>
                      )}
                      <button type="button" className="secondary" onClick={onExportConsultaFnsAnalitico} disabled={isBusy}>
                        Relatorio analitico
                      </button>
                    </div>
                  </div>

                  {consultaFnsSyncStatus && (
                    <div className="card table-card">
                      <p>
                        Status cache: {consultaFnsSyncStatus.status} | Atualizado em: {consultaFnsSyncStatus.atualizado_em ?? "-"} |
                        Entradas: {consultaFnsSyncStatus.entradas_cache} | Falhas: {consultaFnsSyncStatus.falhas}
                      </p>
                    </div>
                  )}

                  {!consultaFnsData ? (
                    <div className="card table-card">
                      <p>Defina os filtros e clique em consultar para listar propostas do Consulta FNS.</p>
                    </div>
                  ) : (
                    <>
                      <div className="card table-card">
                        <h3>Propostas FAF</h3>
                        <p className="muted" style={{ marginTop: 0 }}>
                          Linhas detalhaveis: {consultaFnsData.itens.filter((item) => resolveConsultaFnsNuProposta(item) !== "").length} |
                          Parlamentar preenchido: {consultaFnsData.itens.filter((item) => (item.parlamentares?.length ?? 0) > 0).length}
                        </p>
                        {(consultaFnsFilters.tp_proposta.trim() !== "" ||
                          consultaFnsFilters.tp_recurso.trim() !== "" ||
                          consultaFnsFilters.nu_proposta.trim() !== "") && (
                          <div className="action-row" style={{ marginBottom: 10 }}>
                            <button type="button" className="secondary" onClick={onResetConsultaFnsToSearchStart}>
                              Voltar ao inicio das buscas
                            </button>
                          </div>
                        )}
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Tipo linha</th>
                                <th>Tipo proposta</th>
                                <th>Tipo recurso</th>
                                <th>N° proposta</th>
                                <th>Entidade</th>
                                <th>Valor</th>
                                <th>Valor pago</th>
                                <th>Saldo</th>
                                <th>Parlamentar</th>
                                <th>Partido</th>
                                <th>Emenda</th>
                                <th>Ano</th>
                                <th>Valor emenda</th>
                                <th>Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {consultaFnsData.itens.length === 0 ? (
                                <tr>
                                  <td colSpan={14}>Nenhuma proposta encontrada.</td>
                                </tr>
                              ) : (
                                consultaFnsData.itens.map((item, index) => (
                                  (() => {
                                    const parlamentar = item.parlamentares?.[0];
                                    const hasNuProposta = resolveConsultaFnsNuProposta(item) !== "";
                                    return (
                                  <tr key={`${item.nuProposta ?? index}-${item.coTipoProposta}`}>
                                    <td>
                                      <span className={hasNuProposta ? "stage-badge done" : "stage-badge"}>
                                        {hasNuProposta ? "Detalhavel" : "Agregada"}
                                      </span>
                                    </td>
                                    <td>{item.coTipoProposta}</td>
                                    <td>{item.dsTipoRecurso}</td>
                                    <td>{resolveConsultaFnsNuProposta(item) || "-"}</td>
                                    <td>{item.noEntidade ?? "-"}</td>
                                    <td>{formatCurrency(item.vlProposta)}</td>
                                    <td>{formatCurrency(item.vlPago)}</td>
                                    <td>{formatCurrency(item.vlPagar)}</td>
                                    <td>{parlamentar?.noApelidoPolitico ?? "-"}</td>
                                    <td>{parlamentar?.sgPartido ?? "-"}</td>
                                    <td>{parlamentar?.coEmendaPolitica ?? "-"}</td>
                                    <td>{parlamentar?.nuAnoExercicio ?? "-"}</td>
                                    <td>{parlamentar?.vlIndObjeto == null ? "-" : formatCurrency(Number(parlamentar.vlIndObjeto))}</td>
                                    <td>
                                      <button
                                        type="button"
                                        className="secondary"
                                        onClick={() => void onOpenConsultaFnsDetalhe(item)}
                                        disabled={isBusy}
                                      >
                                        {hasNuProposta ? "Detalhar" : "Listar propostas"}
                                      </button>
                                    </td>
                                  </tr>
                                    );
                                  })()
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="action-row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyConsultaFnsFilters(consultaFnsPage - 1)}
                          disabled={isBusy || !consultaFnsData.paginacao.tem_anterior}
                        >
                          Pagina anterior
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyConsultaFnsFilters(consultaFnsPage + 1)}
                          disabled={isBusy || !consultaFnsData.paginacao.tem_proxima}
                        >
                          Proxima pagina
                        </button>
                      </div>

                      {consultaFnsDetalhe && (
                        <div className="card table-card">
                          <div className="action-row" style={{ marginBottom: 10 }}>
                            <button type="button" className="secondary" onClick={onCloseConsultaFnsDetalhe}>
                              Voltar para lista
                            </button>
                          </div>
                          <h3>Detalhe proposta {consultaFnsSelected?.nuProposta ?? consultaFnsDetalhe.nuProposta}</h3>
                          <p>
                            <strong>Entidade:</strong> {consultaFnsDetalhe.noEntidade} | <strong>Municipio/UF:</strong>{" "}
                            {consultaFnsDetalhe.noMunicipio}/{consultaFnsDetalhe.sgUf} | <strong>Situacao:</strong>{" "}
                            {consultaFnsDetalhe.situacao?.descricaoSituacaoproposta ?? "Nao informada"}
                          </p>
                          <p>
                            <strong>Portaria:</strong> {consultaFnsDetalhe.nuPortaria ?? "-"} | <strong>Processo:</strong>{" "}
                            {consultaFnsDetalhe.nuProcesso ?? "-"}
                          </p>
                          <p>
                            <strong>Valor proposta:</strong> {formatCurrency(consultaFnsDetalhe.vlProposta)} | <strong>Empenhado:</strong>{" "}
                            {formatCurrency(consultaFnsDetalhe.vlEmpenhado)} | <strong>Pago:</strong>{" "}
                            {formatCurrency(consultaFnsDetalhe.vlPago)}
                          </p>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Parlamentar</th>
                                  <th>Partido</th>
                                  <th>Emenda</th>
                                  <th>Ano</th>
                                  <th>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {consultaFnsDetalhe.parlamentares.length === 0 ? (
                                  <tr>
                                    <td colSpan={5}>Nenhum parlamentar informado.</td>
                                  </tr>
                                ) : (
                                  consultaFnsDetalhe.parlamentares.map((item, index) => (
                                    <tr key={`${item.coEmendaPolitica}-${index}`}>
                                      <td>{item.noApelidoPolitico}</td>
                                      <td>{item.sgPartido}</td>
                                      <td>{item.coEmendaPolitica}</td>
                                      <td>{item.nuAnoExercicio}</td>
                                      <td>{formatCurrency(item.vlIndObjeto)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : relatorioTab === "simec_obras" ? (
                <>
                  {!simecObraDetalhe && (
                    <div className="card filters-card">
                      <h3>SIMEC - Painel de Obras</h3>
                      <div className="filters-grid columns-4">
                        <label>
                          UF
                          <select
                            value={simecObrasFilters.uf}
                            onChange={(e) =>
                              setSimecObrasFilters((prev) => ({
                                ...prev,
                                uf: e.target.value,
                                muncod: ""
                              }))
                            }
                          >
                            <option value="">Selecione</option>
                            {simecUfs.map((item) => (
                              <option key={item.uf} value={item.sigla}>
                                {item.sigla} - {item.nome}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Municipio
                          <select
                            value={simecObrasFilters.muncod}
                            onChange={(e) => setSimecObrasFilters((prev) => ({ ...prev, muncod: e.target.value }))}
                            disabled={simecMunicipios.length === 0}
                          >
                            <option value="">Selecione</option>
                            {simecMunicipios.map((item) => (
                              <option key={item.codigo} value={item.codigo}>
                                {item.nome} ({item.codigo})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Codigo municipio (IBGE)
                          <input
                            value={simecObrasFilters.muncod}
                            onChange={(e) =>
                              setSimecObrasFilters((prev) => ({ ...prev, muncod: e.target.value.replace(/\D/g, "") }))
                            }
                            placeholder="Ex.: 120040"
                          />
                        </label>
                        <label>
                          Esfera
                          <input
                            value={simecObrasFilters.esfera}
                            onChange={(e) => setSimecObrasFilters((prev) => ({ ...prev, esfera: e.target.value }))}
                            placeholder="Ex.: MUNICIPAL"
                          />
                        </label>
                        <label>
                          Tipologia
                          <input
                            value={simecObrasFilters.tipologia}
                            onChange={(e) => setSimecObrasFilters((prev) => ({ ...prev, tipologia: e.target.value }))}
                            placeholder="Ex.: QUADRA"
                          />
                        </label>
                        <label>
                          Vigencia
                          <select
                            value={simecObrasFilters.vigencia_status}
                            onChange={(e) =>
                              setSimecObrasFilters((prev) => ({
                                ...prev,
                                vigencia_status: e.target.value as "" | "vencidas" | "30" | "60" | "90"
                              }))
                            }
                          >
                            <option value="">Todas</option>
                            <option value="vencidas">Ja venceram</option>
                            <option value="30">Vencem em ate 30 dias</option>
                            <option value="60">Vencem em ate 60 dias</option>
                            <option value="90">Vencem em ate 90 dias</option>
                          </select>
                        </label>
                        <label>
                          ID da obra
                          <input
                            value={simecObrasFilters.obrid}
                            onChange={(e) =>
                              setSimecObrasFilters((prev) => ({ ...prev, obrid: e.target.value.replace(/\D/g, "") }))
                            }
                            placeholder="Ex.: 1016561"
                          />
                        </label>
                      </div>

                      <div className="action-row">
                        <button type="button" onClick={() => void onApplySimecObrasFilters()} disabled={isBusy}>
                          Consultar
                        </button>
                        <button type="button" className="secondary" onClick={onClearSimecObrasFilters} disabled={isBusy}>
                          Limpar filtros
                        </button>
                      </div>
                    </div>
                  )}

                  {!simecObrasData ? (
                    <div className="card table-card">
                      <p>Selecione UF e municipio para consultar obras do SIMEC.</p>
                    </div>
                  ) : simecObraDetalhe ? (
                    <div className="card table-card">
                      <div className="action-row" style={{ marginBottom: 10 }}>
                        <button type="button" className="secondary" onClick={onCloseSimecObraDetalhe}>
                          Voltar para lista
                        </button>
                      </div>
                      <h3>Detalhe da obra {simecObraDetalheId ?? simecObraDetalhe.obra_id}</h3>
                      <p>
                        <strong>Titulo:</strong> {normalizeReadableTextSafe(simecObraDetalhe.titulo)}
                      </p>
                      <p>
                        <strong>Pagina oficial:</strong>{" "}
                        <a href={simecObraDetalhe.detalhe_url} target="_blank" rel="noreferrer">
                          Abrir no SIMEC
                        </a>
                      </p>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Campo</th>
                              <th>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(simecObraDetalhe.detalhes).length === 0 ? (
                              <tr>
                                <td colSpan={2}>Sem detalhes estruturados para esta obra.</td>
                              </tr>
                            ) : (
                              Object.entries(simecObraDetalhe.detalhes).map(([campo, valor]) => (
                                <tr key={campo}>
                                  <td>{normalizeReadableTextSafe(campo)}</td>
                                  <td>{normalizeReadableTextSafe(valor)}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Obras encontradas</p>
                          <h3>{simecObrasData.total}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Obras exibidas</p>
                          <h3>{filteredSimecObrasItems.length}</h3>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Obras listadas</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Titulo</th>
                                <th>Situacao</th>
                                <th>Localizacao</th>
                                <th>Esfera</th>
                                <th>Tipologia</th>
                                <th>Fim vigencia</th>
                                <th>Dias p/ vencer</th>
                                <th>Valor previsto</th>
                                <th>Pago FNDE</th>
                                <th>% execucao</th>
                                <th>Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredSimecObrasItems.length === 0 ? (
                                <tr>
                                  <td colSpan={12}>Nenhuma obra encontrada para os filtros informados.</td>
                                </tr>
                              ) : (
                                filteredSimecObrasItems.map((item) => {
                                  const diasParaVencer = item.vigencia_fim ? getDaysUntilDate(item.vigencia_fim) : null;
                                  return (
                                    <tr key={item.obra_id}>
                                      <td>{item.obra_id}</td>
                                      <td>{normalizeReadableTextSafe(item.titulo)}</td>
                                      <td>{normalizeReadableTextSafe(item.situacao)}</td>
                                      <td>{normalizeReadableTextSafe(item.localizacao)}</td>
                                      <td>{normalizeReadableTextSafe(item.esfera)}</td>
                                      <td>{normalizeReadableTextSafe(item.tipo)}</td>
                                      <td>{item.vigencia_fim ? formatDateOnlyPtBr(item.vigencia_fim) : "-"}</td>
                                      <td>{diasParaVencer === null ? "-" : `${diasParaVencer} dias`}</td>
                                      <td>{item.valor_previsto == null ? "-" : formatCurrency(item.valor_previsto)}</td>
                                      <td>{item.valor_pago_fnde == null ? "-" : formatCurrency(item.valor_pago_fnde)}</td>
                                      <td>{item.percentual_execucao == null ? "-" : `${item.percentual_execucao.toFixed(2)}%`}</td>
                                      <td>
                                        <button
                                          type="button"
                                          className="secondary"
                                          onClick={() => void onOpenSimecObraDetalhe(item.obra_id)}
                                          disabled={isBusy}
                                        >
                                          Detalhar
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : relatorioTab === "transferencias_especiais" ? (
                <>
                  <div className="card filters-card">
                    <h3>Transferencias especiais (Transferegov)</h3>
                    <div className="filters-grid columns-4">
                      <label>
                        CNPJ beneficiario
                        <input
                          value={transferenciasEspeciaisFilters.cnpj}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, cnpj: e.target.value }))
                          }
                          placeholder="Somente numeros"
                        />
                      </label>
                      <label>
                        Nome beneficiario
                        <input
                          value={transferenciasEspeciaisFilters.nome_beneficiario}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, nome_beneficiario: e.target.value }))
                          }
                          placeholder="Ex.: MUNICIPIO DE..."
                        />
                      </label>
                      <label>
                        UF
                        <input
                          value={transferenciasEspeciaisFilters.uf}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))
                          }
                          maxLength={2}
                          placeholder="Ex.: MG"
                        />
                      </label>
                      <label>
                        Ano
                        <input
                          type="number"
                          min={2019}
                          max={2100}
                          value={transferenciasEspeciaisFilters.ano}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, ano: e.target.value }))
                          }
                          placeholder="Ex.: 2026"
                        />
                      </label>
                      <label>
                        Situacao
                        <input
                          value={transferenciasEspeciaisFilters.situacao}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, situacao: e.target.value }))
                          }
                          placeholder="Ex.: CIENTE"
                        />
                      </label>
                      <label>
                        Codigo plano de acao
                        <input
                          value={transferenciasEspeciaisFilters.codigo_plano_acao}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, codigo_plano_acao: e.target.value }))
                          }
                          placeholder="Ex.: 0903-003192"
                        />
                      </label>
                      <label>
                        Parlamentar
                        <input
                          value={transferenciasEspeciaisFilters.parlamentar}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, parlamentar: e.target.value }))
                          }
                          placeholder="Nome do parlamentar"
                        />
                      </label>
                      <label>
                        Tamanho da pagina
                        <select
                          value={transferenciasEspeciaisFilters.page_size}
                          onChange={(e) =>
                            setTransferenciasEspeciaisFilters((prev) => ({ ...prev, page_size: e.target.value }))
                          }
                        >
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </label>
                    </div>

                    <div className="action-row">
                      <button type="button" onClick={() => void onApplyTransferenciasEspeciaisFilters(1)} disabled={isBusy}>
                        Consultar
                      </button>
                      <button type="button" className="secondary" onClick={onClearTransferenciasEspeciaisFilters}>
                        Limpar filtros
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => transferenciasEspeciaisData && exportTransferenciasEspeciaisCsv(transferenciasEspeciaisData)}
                        disabled={!transferenciasEspeciaisData}
                      >
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          transferenciasEspeciaisData && exportTransferenciasEspeciaisPdf(transferenciasEspeciaisData, "executivo")
                        }
                        disabled={!transferenciasEspeciaisData}
                      >
                        PDF Executivo
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          transferenciasEspeciaisData && exportTransferenciasEspeciaisPdf(transferenciasEspeciaisData, "analitico")
                        }
                        disabled={!transferenciasEspeciaisData}
                      >
                        PDF Analitico
                      </button>
                    </div>
                  </div>

                  {!transferenciasEspeciaisData ? (
                    <div className="card table-card">
                      <p>Preencha os filtros e consulte para visualizar os planos de acao especial.</p>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Total de registros</p>
                          <h3>{transferenciasEspeciaisData.paginacao.total}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Pagina atual</p>
                          <h3>
                            {transferenciasEspeciaisData.paginacao.pagina}/{transferenciasEspeciaisData.paginacao.total_paginas}
                          </h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Atualizado em</p>
                          <h3>{new Date(transferenciasEspeciaisData.cache.atualizado_em).toLocaleString("pt-BR")}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Fonte</p>
                          <h3>{transferenciasEspeciaisData.cache.em_cache ? "Cache" : "Tempo real"}</h3>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Planos de acao especial</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Codigo</th>
                                <th>Ano</th>
                                <th>Situacao</th>
                                <th>Beneficiario</th>
                                <th>UF</th>
                                <th>CNPJ</th>
                                <th>Parlamentar</th>
                                <th>Custeio</th>
                                <th>Investimento</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transferenciasEspeciaisData.itens.length === 0 ? (
                                <tr>
                                  <td colSpan={10}>Nenhum plano de acao encontrado para os filtros informados.</td>
                                </tr>
                              ) : (
                                transferenciasEspeciaisData.itens.map((item) => (
                                  <tr key={item.id_plano_acao}>
                                    <td>{item.id_plano_acao}</td>
                                    <td>{item.codigo_plano_acao}</td>
                                    <td>{item.ano_plano_acao}</td>
                                    <td>{item.situacao_plano_acao}</td>
                                    <td>{item.nome_beneficiario_plano_acao}</td>
                                    <td>{item.uf_beneficiario_plano_acao}</td>
                                    <td>{item.cnpj_beneficiario_plano_acao}</td>
                                    <td>{item.nome_parlamentar_emenda_plano_acao ?? "-"}</td>
                                    <td>{formatCurrency(item.valor_custeio_plano_acao)}</td>
                                    <td>{formatCurrency(item.valor_investimento_plano_acao)}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="action-row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyTransferenciasEspeciaisFilters(transferenciasEspeciaisPage - 1)}
                          disabled={isBusy || !transferenciasEspeciaisData.paginacao.tem_anterior}
                        >
                          Pagina anterior
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyTransferenciasEspeciaisFilters(transferenciasEspeciaisPage + 1)}
                          disabled={isBusy || !transferenciasEspeciaisData.paginacao.tem_proxima}
                        >
                          Proxima pagina
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : relatorioTab === "transferencias_discricionarias" ? (
                <>
                  <div className="card filters-card">
                    <h3>Transferencias discricionarias e legais (Transferegov)</h3>
                    <div className="tab-row" style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        className={transferenciasDiscricionariasTab === "convenios" ? "tab active" : "tab"}
                        onClick={() => setTransferenciasDiscricionariasTab("convenios")}
                      >
                        Convenios
                      </button>
                      <button
                        type="button"
                        className={transferenciasDiscricionariasTab === "proponente" ? "tab active" : "tab"}
                        onClick={() => setTransferenciasDiscricionariasTab("proponente")}
                      >
                        Desembolsos por proponente
                      </button>
                    </div>

                    {transferenciasDiscricionariasTab === "convenios" && (
                      <>
                    <div className="filters-grid columns-4">
                      <label>
                        CNPJ proponente
                        <input
                          list="td-cnpj-sugestoes"
                          value={transferenciasDiscricionariasFilters.cnpj}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            const sugestaoSelecionada = transferenciasDiscricionariasCnpjSugestoes.find(
                              (item) => item.cnpj === digits
                            );
                            setTransferenciasDiscricionariasFilters((prev) => ({
                              ...prev,
                              cnpj: formatCnpj(digits),
                              nome_proponente: sugestaoSelecionada?.nome_proponente ?? prev.nome_proponente
                            }));
                          }}
                          placeholder="00.000.000/0000-00"
                        />
                        <datalist id="td-cnpj-sugestoes">
                          {transferenciasDiscricionariasCnpjSugestoes.map((item) => (
                            <option key={`${item.cnpj}-${item.nome_proponente}`} value={formatCnpj(item.cnpj)}>
                              {`${formatCnpj(item.cnpj)} - ${item.nome_proponente}`}
                            </option>
                          ))}
                        </datalist>
                      </label>
                      <label>
                        Nome proponente
                        <input
                          value={transferenciasDiscricionariasFilters.nome_proponente}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, nome_proponente: e.target.value }))
                          }
                          placeholder="Ex.: PREFEITURA..."
                        />
                      </label>
                      <label>
                        UF
                        <select
                          value={transferenciasDiscricionariasFilters.uf}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, uf: e.target.value }))
                          }
                        >
                          <option value="">Todas</option>
                          {(transferenciasDiscricionariasFiltros?.ufs ?? []).map((uf) => (
                            <option key={uf} value={uf}>
                              {uf}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Municipio
                        <input
                          value={transferenciasDiscricionariasFilters.municipio}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, municipio: e.target.value }))
                          }
                          placeholder="Ex.: SALVADOR"
                        />
                      </label>
                      <label>
                        Ano
                        <input
                          type="number"
                          min={2000}
                          max={2100}
                          value={transferenciasDiscricionariasFilters.ano}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, ano: e.target.value }))
                          }
                          placeholder="Ex.: 2025"
                        />
                      </label>
                      <label>
                        Vigencias a vencer em ate
                        <select
                          value={transferenciasDiscricionariasFilters.vigencia_a_vencer_dias}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({
                              ...prev,
                              vigencia_a_vencer_dias: e.target.value as "" | "30" | "60" | "90"
                            }))
                          }
                        >
                          <option value="">Sem filtro</option>
                          <option value="30">30 dias</option>
                          <option value="60">60 dias</option>
                          <option value="90">90 dias</option>
                        </select>
                      </label>
                      <label>
                        Situacao proposta
                        <select
                          value={transferenciasDiscricionariasFilters.situacao_proposta}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, situacao_proposta: e.target.value }))
                          }
                        >
                          <option value="">Todas</option>
                          {(transferenciasDiscricionariasFiltros?.situacoes_proposta ?? []).map((situacao) => (
                            <option key={situacao} value={situacao}>
                              {situacao}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Situacao convenio
                        <select
                          value={transferenciasDiscricionariasFilters.situacao_convenio}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, situacao_convenio: e.target.value }))
                          }
                        >
                          <option value="">Todas</option>
                          {(transferenciasDiscricionariasFiltros?.situacoes_convenio ?? []).map((situacao) => (
                            <option key={situacao} value={situacao}>
                              {situacao}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tipo ente
                        <select
                          value={transferenciasDiscricionariasFilters.tipo_ente}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({
                              ...prev,
                              tipo_ente: e.target.value as "" | "estado" | "municipio"
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          <option value="estado">Estado</option>
                          <option value="municipio">Municipio</option>
                        </select>
                      </label>
                      <label>
                        Nr convenio
                        <input
                          value={transferenciasDiscricionariasFilters.nr_convenio}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, nr_convenio: e.target.value }))
                          }
                          placeholder="Ex.: 943522"
                        />
                      </label>
                      <label>
                        Nr proposta
                        <input
                          value={transferenciasDiscricionariasFilters.nr_proposta}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, nr_proposta: e.target.value }))
                          }
                          placeholder="Ex.: 12345/2025"
                        />
                      </label>
                      <label>
                        Tamanho da pagina
                        <select
                          value={transferenciasDiscricionariasFilters.page_size}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasFilters((prev) => ({ ...prev, page_size: e.target.value }))
                          }
                        >
                          <option value="10">10</option>
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </label>
                    </div>

                    <div className="action-row">
                      <button
                        type="button"
                        onClick={() => void onApplyTransferenciasDiscricionariasFilters(1)}
                        disabled={isBusy || isSyncingTransferenciasDiscricionarias}
                      >
                        Consultar
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onApplyTransferenciasDiscricionariasVigenciaPreset(30)}
                        disabled={isBusy || isSyncingTransferenciasDiscricionarias}
                      >
                        Vencem em 30 dias
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onApplyTransferenciasDiscricionariasVigenciaPreset(60)}
                        disabled={isBusy || isSyncingTransferenciasDiscricionarias}
                      >
                        Vencem em 60 dias
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onApplyTransferenciasDiscricionariasVigenciaPreset(90)}
                        disabled={isBusy || isSyncingTransferenciasDiscricionarias}
                      >
                        Vencem em 90 dias
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={onClearTransferenciasDiscricionariasFilters}
                        disabled={isSyncingTransferenciasDiscricionarias}
                      >
                        Limpar filtros
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onRefreshTransferenciasDiscricionariasSyncStatus()}
                        disabled={isSyncingTransferenciasDiscricionarias}
                      >
                        {isSyncingTransferenciasDiscricionarias ? "Atualizando status..." : "Atualizar status"}
                      </button>
                      {canManageInstruments && (
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onSyncTransferenciasDiscricionarias()}
                          disabled={isSyncingTransferenciasDiscricionarias}
                        >
                          {isSyncingTransferenciasDiscricionarias ? "Sincronizando base..." : "Sincronizar base"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onExportTransferenciasDiscricionariasPdf("analitico")}
                        disabled={!transferenciasDiscricionariasData || isBusy || isSyncingTransferenciasDiscricionarias}
                      >
                        PDF Analitico
                      </button>
                    </div>

                    <p className="muted" style={{ marginTop: 6 }}>
                      Campos detalhados (inicio/fim de vigencia e prestacao de contas) estao disponiveis no PDF Analitico.
                      Se o campo de convenio ficar vazio, o PDF inclui automaticamente os convenios da consulta atual (limite de 30).
                      No historico de desembolsos, sao listados somente convenios com mais de uma parcela.
                    </p>

                    <div className="filters-grid columns-4">
                      <label>
                        Convenios para historico de desembolsos (opcional)
                        <input
                          value={transferenciasDiscricionariasDesembolsoFilters.nr_convenio}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
                              ...prev,
                              nr_convenio: e.target.value
                            }))
                          }
                          placeholder="Ex.: 943522, 812112"
                        />
                      </label>
                      <label>
                        Ano desembolso
                        <input
                          type="number"
                          min={2000}
                          max={2100}
                          value={transferenciasDiscricionariasDesembolsoFilters.ano}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
                              ...prev,
                              ano: e.target.value
                            }))
                          }
                          placeholder="Todos"
                        />
                      </label>
                      <label>
                        Mes desembolso
                        <select
                          value={transferenciasDiscricionariasDesembolsoFilters.mes}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
                              ...prev,
                              mes: e.target.value
                            }))
                          }
                        >
                          <option value="">Todos</option>
                          {Array.from({ length: 12 }, (_, index) => {
                            const month = index + 1;
                            return (
                              <option key={month} value={String(month)}>
                                {month.toString().padStart(2, "0")}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label>
                        Tamanho pagina desembolsos
                        <select
                          value={transferenciasDiscricionariasDesembolsoFilters.page_size}
                          onChange={(e) =>
                            setTransferenciasDiscricionariasDesembolsoFilters((prev) => ({
                              ...prev,
                              page_size: e.target.value
                            }))
                          }
                        >
                          <option value="20">20</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                          <option value="200">200</option>
                        </select>
                      </label>
                    </div>

                    <div className="action-row">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => void onApplyTransferenciasDiscricionariasDesembolsoFilters(1)}
                        disabled={isLoadingTransferenciasDiscricionariasDesembolsos}
                      >
                        {isLoadingTransferenciasDiscricionariasDesembolsos ? "Consultando desembolsos..." : "Consultar desembolsos"}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={onClearTransferenciasDiscricionariasDesembolsos}
                        disabled={isLoadingTransferenciasDiscricionariasDesembolsos}
                      >
                        Limpar desembolsos
                      </button>
                    </div>
                      </>
                    )}

                    {transferenciasDiscricionariasTab === "proponente" && (
                      <>
                        <div className="filters-grid columns-4">
                          <label>
                            CNPJ proponente
                            <input
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.cnpj}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  cnpj: formatCnpj(e.target.value.replace(/\D/g, ""))
                                }))
                              }
                              placeholder="00.000.000/0000-00"
                            />
                          </label>
                          <label>
                            Nome proponente
                            <input
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.nome_proponente}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  nome_proponente: e.target.value
                                }))
                              }
                              placeholder="Ex.: PREFEITURA..."
                            />
                          </label>
                          <label>
                            Ano desembolso
                            <input
                              type="number"
                              min={2000}
                              max={2100}
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.ano}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  ano: e.target.value
                                }))
                              }
                              placeholder="Todos"
                            />
                          </label>
                          <label>
                            Mes desembolso
                            <select
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.mes}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  mes: e.target.value
                                }))
                              }
                            >
                              <option value="">Todos</option>
                              {Array.from({ length: 12 }, (_, index) => {
                                const month = index + 1;
                                return (
                                  <option key={month} value={String(month)}>
                                    {month.toString().padStart(2, "0")}
                                  </option>
                                );
                              })}
                            </select>
                          </label>
                          <label>
                            Tamanho da pagina
                            <select
                              value={transferenciasDiscricionariasProponenteDesembolsoFilters.page_size}
                              onChange={(e) =>
                                setTransferenciasDiscricionariasProponenteDesembolsoFilters((prev) => ({
                                  ...prev,
                                  page_size: e.target.value
                                }))
                              }
                            >
                              <option value="50">50</option>
                              <option value="100">100</option>
                              <option value="200">200</option>
                              <option value="500">500</option>
                            </select>
                          </label>
                        </div>

                        <div className="action-row">
                          <button
                            type="button"
                            onClick={() => void onApplyTransferenciasDiscricionariasProponenteDesembolsoFilters(1)}
                            disabled={isLoadingTransferenciasDiscricionariasProponenteDesembolsos}
                          >
                            {isLoadingTransferenciasDiscricionariasProponenteDesembolsos
                              ? "Consultando..."
                              : "Consultar por proponente"}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={onClearTransferenciasDiscricionariasProponenteDesembolsos}
                            disabled={isLoadingTransferenciasDiscricionariasProponenteDesembolsos}
                          >
                            Limpar filtros
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => void onExportTransferenciasDiscricionariasProponenteDesembolsosPdf("executivo")}
                            disabled={isLoadingTransferenciasDiscricionariasProponenteDesembolsos}
                          >
                            PDF Executivo
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => void onExportTransferenciasDiscricionariasProponenteDesembolsosPdf("analitico")}
                            disabled={isLoadingTransferenciasDiscricionariasProponenteDesembolsos}
                          >
                            PDF Analitico
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {transferenciasDiscricionariasTab === "convenios" && (!transferenciasDiscricionariasData ? (
                    <>
                      <div className="card table-card">
                        <p>Preencha os filtros e consulte para visualizar transferencias discricionarias e legais.</p>
                      </div>
                      {transferenciasDiscricionariasSyncInfo && (
                        <div className="card table-card">
                          <p>
                            Ultima carga: {transferenciasDiscricionariasSyncInfo.data_carga_fonte ?? "Nao informada"} | Status: {" "}
                            {transferenciasDiscricionariasSyncInfo.status} | Registros: {" "}
                            {transferenciasDiscricionariasSyncInfo.total_registros.toLocaleString("pt-BR")}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Total de registros</p>
                          <h3>{transferenciasDiscricionariasData.paginacao.total}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Pagina atual</p>
                          <h3>
                            {transferenciasDiscricionariasData.paginacao.pagina}/
                            {transferenciasDiscricionariasData.paginacao.total_paginas}
                          </h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Data da carga oficial</p>
                          <h3>{transferenciasDiscricionariasSyncInfo?.data_carga_fonte ?? "Nao informada"}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Status da sincronizacao</p>
                          <h3>{transferenciasDiscricionariasSyncInfo?.status ?? "desconhecido"}</h3>
                        </div>
                      </div>

                      {transferenciasDiscricionariasSyncInfo?.detalhe && (
                        <div className="card table-card">
                          <p>{transferenciasDiscricionariasSyncInfo.detalhe}</p>
                        </div>
                      )}

                      <div className="card table-card">
                        <h3>Propostas e convenios (discricionarias/legais)</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Nr proposta</th>
                                <th>Nr convenio</th>
                                <th>UF</th>
                                <th>Proponente</th>
                                <th>Objeto</th>
                                <th>Situacao proposta</th>
                                <th>Situacao convenio</th>
                                <th>Ano</th>
                                <th>Fim vigencia</th>
                                <th>Dias p/ vencer</th>
                                <th>Contrapartida financeira</th>
                                <th>Valor global</th>
                                <th>Desembolsado</th>
                                <th>Acoes</th>
                              </tr>
                            </thead>
                            <tbody>
                                {transferenciasDiscricionariasData.itens.length === 0 ? (
                                  <tr>
                                    <td colSpan={14}>Nenhum registro encontrado para os filtros informados.</td>
                                  </tr>
                                ) : (
                                transferenciasDiscricionariasData.itens.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.nr_proposta ?? "-"}</td>
                                    <td>{item.nr_convenio ?? "-"}</td>
                                    <td>{item.uf ?? "-"}</td>
                                    <td>{item.nome_proponente ?? "-"}</td>
                                    <td>{normalizeReadableText(item.objeto) ?? "-"}</td>
                                    <td>{item.situacao_proposta ?? "-"}</td>
                                    <td>{item.situacao_convenio ?? "-"}</td>
                                    <td>{item.ano_referencia ?? "-"}</td>
                                    <td>{item.dia_fim_vigencia ?? "-"}</td>
                                    <td>{item.dias_para_vencimento == null ? "-" : `${item.dias_para_vencimento} dias`}</td>
                                    <td>
                                      {item.valor_contrapartida_financeira === null
                                        ? "-"
                                        : formatCurrency(item.valor_contrapartida_financeira)}
                                    </td>
                                    <td>{item.valor_global_conv === null ? "-" : formatCurrency(item.valor_global_conv)}</td>
                                    <td>
                                      {item.valor_desembolsado_conv === null
                                        ? "-"
                                        : formatCurrency(item.valor_desembolsado_conv)}
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className="secondary"
                                        onClick={() => item.nr_convenio && void onOpenTransferenciasDiscricionariasDesembolsos(item.nr_convenio)}
                                        disabled={!item.nr_convenio || isLoadingTransferenciasDiscricionariasDesembolsos}
                                      >
                                        Ver desembolsos
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {transferenciasDiscricionariasDesembolsoData && (
                        <>
                          <div className="report-kpi-grid">
                            <div className="card kpi-card">
                              <p className="eyebrow">Convenio selecionado</p>
                              <h3>{transferenciasDiscricionariasDesembolsoData.resumo.nr_convenio}</h3>
                            </div>
                            <div className="card kpi-card">
                              <p className="eyebrow">Total de desembolsos</p>
                              <h3>{transferenciasDiscricionariasDesembolsoData.resumo.total_desembolsos}</h3>
                            </div>
                            <div className="card kpi-card">
                              <p className="eyebrow">Valor total desembolsado</p>
                              <h3>{formatCurrency(transferenciasDiscricionariasDesembolsoData.resumo.valor_total_desembolsado)}</h3>
                            </div>
                            <div className="card kpi-card">
                              <p className="eyebrow">Pagina atual</p>
                              <h3>
                                {transferenciasDiscricionariasDesembolsoData.paginacao.pagina}/
                                {transferenciasDiscricionariasDesembolsoData.paginacao.total_paginas}
                              </h3>
                            </div>
                          </div>

                          <div className="card table-card">
                            <h3>Historico de desembolsos do convenio</h3>
                            <div className="table-wrap">
                              <table>
                                <thead>
                                  <tr>
                                    <th>ID desembolso</th>
                                    <th>Data desembolso</th>
                                    <th>Ult. desembolso</th>
                                    <th>Ano</th>
                                    <th>Mes</th>
                                    <th>Dias sem desembolso</th>
                                    <th>Nr SIAFI</th>
                                    <th>UG emitente</th>
                                    <th>Valor desembolsado</th>
                                    <th>Observacao</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transferenciasDiscricionariasDesembolsoData.itens.length === 0 ? (
                                    <tr>
                                      <td colSpan={10}>Nenhum desembolso encontrado para os filtros informados.</td>
                                    </tr>
                                  ) : (
                                    transferenciasDiscricionariasDesembolsoData.itens.map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.id_desembolso ?? "-"}</td>
                                        <td>{item.data_desembolso ? formatDateOnlyPtBr(item.data_desembolso) : "-"}</td>
                                        <td>{item.dt_ult_desembolso ? formatDateOnlyPtBr(item.dt_ult_desembolso) : "-"}</td>
                                        <td>{item.ano_desembolso ?? "-"}</td>
                                        <td>{item.mes_desembolso ?? "-"}</td>
                                        <td>{item.qtd_dias_sem_desembolso ?? "-"}</td>
                                        <td>{item.nr_siafi ?? "-"}</td>
                                        <td>{item.ug_emitente_dh ?? "-"}</td>
                                        <td>{item.vl_desembolsado === null ? "-" : formatCurrency(item.vl_desembolsado)}</td>
                                        <td>{item.observacao_dh ?? "-"}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="action-row">
                            <button
                              type="button"
                              className="secondary"
                              onClick={() =>
                                void onApplyTransferenciasDiscricionariasDesembolsoFilters(
                                  transferenciasDiscricionariasDesembolsoPage - 1
                                )
                              }
                              disabled={
                                isLoadingTransferenciasDiscricionariasDesembolsos ||
                                !transferenciasDiscricionariasDesembolsoData.paginacao.tem_anterior
                              }
                            >
                              Pagina anterior (desembolsos)
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() =>
                                void onApplyTransferenciasDiscricionariasDesembolsoFilters(
                                  transferenciasDiscricionariasDesembolsoPage + 1
                                )
                              }
                              disabled={
                                isLoadingTransferenciasDiscricionariasDesembolsos ||
                                !transferenciasDiscricionariasDesembolsoData.paginacao.tem_proxima
                              }
                            >
                              Proxima pagina (desembolsos)
                            </button>
                          </div>
                        </>
                      )}

                      <div className="action-row">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyTransferenciasDiscricionariasFilters(transferenciasDiscricionariasPage - 1)}
                          disabled={isBusy || !transferenciasDiscricionariasData.paginacao.tem_anterior}
                        >
                          Pagina anterior
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void onApplyTransferenciasDiscricionariasFilters(transferenciasDiscricionariasPage + 1)}
                          disabled={isBusy || !transferenciasDiscricionariasData.paginacao.tem_proxima}
                        >
                          Proxima pagina
                        </button>
                      </div>
                    </>
                  ))}

                  {transferenciasDiscricionariasTab === "proponente" && (
                    !transferenciasDiscricionariasProponenteDesembolsoData ? (
                      <div className="card table-card">
                        <p>Informe CNPJ ou nome do proponente para consultar desembolsos e exportar PDF.</p>
                      </div>
                    ) : (
                      <>
                        <div className="report-kpi-grid">
                          <div className="card kpi-card">
                            <p className="eyebrow">Proponente</p>
                            <h3>{transferenciasDiscricionariasProponenteDesembolsoData.resumo.nome_proponente ?? "Nao informado"}</h3>
                          </div>
                          <div className="card kpi-card">
                            <p className="eyebrow">CNPJ</p>
                            <h3>
                              {transferenciasDiscricionariasProponenteDesembolsoData.resumo.cnpj
                                ? formatCnpj(transferenciasDiscricionariasProponenteDesembolsoData.resumo.cnpj)
                                : "Nao informado"}
                            </h3>
                          </div>
                          <div className="card kpi-card">
                            <p className="eyebrow">Total de desembolsos</p>
                            <h3>{transferenciasDiscricionariasProponenteDesembolsoData.resumo.total_desembolsos}</h3>
                          </div>
                          <div className="card kpi-card">
                            <p className="eyebrow">Valor total desembolsado</p>
                            <h3>
                              {formatCurrency(
                                transferenciasDiscricionariasProponenteDesembolsoData.resumo.valor_total_desembolsado
                              )}
                            </h3>
                          </div>
                        </div>

                        <div className="card table-card">
                          <h3>Desembolsos por proponente</h3>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Parcela</th>
                                  <th>ID desembolso</th>
                                  <th>Convenio</th>
                                  <th>Objeto</th>
                                  <th>Contrapartida</th>
                                  <th>UF</th>
                                  <th>Municipio</th>
                                  <th>Data</th>
                                  <th>Ano</th>
                                  <th>Mes</th>
                                  <th>SIAFI</th>
                                  <th>UG emitente</th>
                                  <th>Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {transferenciasDiscricionariasProponenteDesembolsoData.itens.length === 0 ? (
                                  <tr>
                                    <td colSpan={13}>Nenhum desembolso encontrado para o proponente informado.</td>
                                  </tr>
                                ) : (
                                  transferenciasDiscricionariasProponenteDesembolsoData.itens.map((item) => (
                                    <tr key={item.id}>
                                      <td>{transferenciasDiscricionariasProponenteParcelaMap.get(item.id) ?? "-"}a parcela</td>
                                      <td>{item.id_desembolso ?? "-"}</td>
                                      <td>{item.nr_convenio ?? "-"}</td>
                                      <td>{normalizeReadableText(item.objeto) ?? "-"}</td>
                                      <td>
                                        {item.valor_contrapartida_financeira === null
                                          ? "-"
                                          : formatCurrency(item.valor_contrapartida_financeira)}
                                      </td>
                                      <td>{item.uf ?? "-"}</td>
                                      <td>{item.municipio ?? "-"}</td>
                                      <td>{item.data_desembolso ? formatDateOnlyPtBr(item.data_desembolso) : "-"}</td>
                                      <td>{item.ano_desembolso ?? "-"}</td>
                                      <td>{item.mes_desembolso ?? "-"}</td>
                                      <td>{item.nr_siafi ?? "-"}</td>
                                      <td>{item.ug_emitente_dh ?? "-"}</td>
                                      <td>{item.vl_desembolsado === null ? "-" : formatCurrency(item.vl_desembolsado)}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="action-row">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void onApplyTransferenciasDiscricionariasProponenteDesembolsoFilters(
                                transferenciasDiscricionariasProponenteDesembolsoPage - 1
                              )
                            }
                            disabled={
                              isLoadingTransferenciasDiscricionariasProponenteDesembolsos ||
                              !transferenciasDiscricionariasProponenteDesembolsoData.paginacao.tem_anterior
                            }
                          >
                            Pagina anterior
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() =>
                              void onApplyTransferenciasDiscricionariasProponenteDesembolsoFilters(
                                transferenciasDiscricionariasProponenteDesembolsoPage + 1
                              )
                            }
                            disabled={
                              isLoadingTransferenciasDiscricionariasProponenteDesembolsos ||
                              !transferenciasDiscricionariasProponenteDesembolsoData.paginacao.tem_proxima
                            }
                          >
                            Proxima pagina
                          </button>
                        </div>
                      </>
                    )
                  )}
                </>
              ) : (
                <>
                  <div className="card filters-card">
                    <h3>Relatorio de tickets</h3>
                    <div className="filters-grid columns-4">
                      <label>
                        Data de
                        <input
                          type="date"
                          value={ticketReportFilters.data_de}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, data_de: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Data ate
                        <input
                          type="date"
                          value={ticketReportFilters.data_ate}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, data_ate: e.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Status
                        <select
                          value={ticketReportFilters.status}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, status: e.target.value as TicketStatus | "" }))
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
                          value={ticketReportFilters.prioridade}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, prioridade: e.target.value as TicketPriority | "" }))
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
                          value={ticketReportFilters.origem}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, origem: e.target.value as TicketSource | "" }))
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
                        Responsavel
                        <select
                          value={ticketReportFilters.responsavel_user_id}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, responsavel_user_id: e.target.value }))
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
                          value={ticketReportFilters.q}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, q: e.target.value }))
                          }
                          placeholder="Codigo, titulo, descricao"
                        />
                      </label>
                      <label className="ticket-overdue-toggle">
                        <span>Somente atrasados</span>
                        <input
                          type="checkbox"
                          checked={ticketReportFilters.somente_atrasados}
                          onChange={(e) =>
                            setTicketReportFilters((prev) => ({ ...prev, somente_atrasados: e.target.checked }))
                          }
                        />
                      </label>
                    </div>

                    <div className="action-row">
                      <button type="button" onClick={onApplyTicketReportFilters} disabled={isBusy}>
                        Gerar relatorio
                      </button>
                      <button type="button" className="secondary" onClick={onClearTicketReportFilters}>
                        Limpar filtros
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => ticketReportData && exportTicketReportCsv(ticketReportData)}
                        disabled={!ticketReportData}
                      >
                        Exportar CSV
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => ticketReportData && exportTicketReportExcel(ticketReportData)}
                        disabled={!ticketReportData}
                      >
                        Exportar Excel
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onExportTicketReportPdf("executivo")}
                        disabled={!ticketReportData}
                      >
                        PDF Executivo
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => onExportTicketReportPdf("analitico")}
                        disabled={!ticketReportData}
                      >
                        PDF Analitico
                      </button>
                    </div>
                  </div>

                  {!ticketReportData ? (
                    <div className="card table-card">
                      <p>Selecione os filtros e gere o relatorio para visualizar os tickets.</p>
                    </div>
                  ) : (
                    <>
                      <div className="report-kpi-grid">
                        <div className="card kpi-card">
                          <p className="eyebrow">Total</p>
                          <h3>{ticketReportSummary.total}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Em aberto</p>
                          <h3>{ticketReportSummary.abertos}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Resolvidos</p>
                          <h3>{ticketReportSummary.resolvidos}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Atrasados</p>
                          <h3>{ticketReportSummary.atrasados}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Sem atribuicao</p>
                          <h3>{ticketReportSummary.semAtribuicao}</h3>
                        </div>
                        <div className="card kpi-card">
                          <p className="eyebrow">Tempo medio resolucao</p>
                          <h3>{ticketReportSummary.tempoMedioResolucaoDias.toFixed(1)} dia(s)</h3>
                        </div>
                      </div>

                      <div className="report-charts-grid">
                        <div className="card">
                          <h3>Tickets por status</h3>
                          <div className="report-bars">
                            {ticketReportSummary.porStatus.map((item) => {
                              const max = Math.max(...ticketReportSummary.porStatus.map((point) => point.quantidade), 1);
                              const width = (item.quantidade / max) * 100;
                              return (
                                <div key={item.status} className="report-bar-row">
                                  <span>{TICKET_STATUS_LABELS[item.status]}</span>
                                  <div className="report-bar-track">
                                    <div className="report-bar-fill" style={{ width: `${width}%` }} />
                                  </div>
                                  <strong>{item.quantidade}</strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="card">
                          <h3>Top responsaveis</h3>
                          <div className="report-bars">
                            {ticketReportSummary.topResponsaveis.length === 0 ? (
                              <p className="subtitle">Sem dados para o filtro atual.</p>
                            ) : (
                              ticketReportSummary.topResponsaveis.map((item) => {
                                const max = Math.max(...ticketReportSummary.topResponsaveis.map((point) => point.quantidade), 1);
                                const width = (item.quantidade / max) * 100;
                                return (
                                  <div key={item.nome} className="report-bar-row">
                                    <span>{item.nome}</span>
                                    <div className="report-bar-track">
                                      <div className="report-bar-fill secondary" style={{ width: `${width}%` }} />
                                    </div>
                                    <strong>{item.quantidade}</strong>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="card table-card">
                        <h3>Tickets no filtro</h3>
                        <div className="table-wrap">
                          <table>
                            <thead>
                              <tr>
                                <th>Codigo</th>
                                <th>Titulo</th>
                                <th>Status</th>
                                <th>Prioridade</th>
                                <th>Atribuido</th>
                                <th>Origem</th>
                                <th>Prazo alvo</th>
                                <th>SLA</th>
                                <th>Criado em</th>
                                <th>Resolvido em</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ticketReportData.length === 0 ? (
                                <tr>
                                  <td colSpan={10}>Nenhum ticket encontrado para os filtros selecionados.</td>
                                </tr>
                              ) : (
                                ticketReportData.map((item) => (
                                  <tr key={item.id}>
                                    <td>{item.codigo}</td>
                                    <td>{item.titulo}</td>
                                    <td>{TICKET_STATUS_LABELS[item.status]}</td>
                                    <td>{TICKET_PRIORITY_LABELS[item.prioridade]}</td>
                                    <td>{item.responsavel?.nome ?? "Nao atribuido"}</td>
                                    <td>{TICKET_SOURCE_LABELS[item.origem]}</td>
                                    <td>{item.prazo_alvo ? formatDateOnlyPtBr(item.prazo_alvo) : "Nao definido"}</td>
                                    <td>{formatTicketSla(item)}</td>
                                    <td>{new Date(item.created_at).toLocaleString("pt-BR")}</td>
                                    <td>{item.resolvido_em ? new Date(item.resolvido_em).toLocaleString("pt-BR") : "-"}</td>
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
