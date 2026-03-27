import type {
  ApiError,
  AuditAction,
  AuditLogItem,
  ChecklistExternalFile,
  AuthResponse,
  ChecklistItem,
  ChecklistItemStatus,
  ChecklistResponse,
  Convenete,
  ConvenetePayload,
  DocumentQaResponse,
  DocumentSearchResponse,
  DeadlineAlertResponse,
  InstrumentFilters,
  InstrumentStatus,
  InstrumentRepasse,
  InstrumentPayload,
  Instrument,
  ManagedUser,
  HealthResponse,
  ObraReportResponse,
  Role,
  Ticket,
  TicketPriority,
  TicketStatus,
  TicketSource,
  RepasseReportResponse,
  StageFollowUp,
  StageFollowUpListResponse,
  User,
  WorkProgress,
  WorkflowStage
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const buildUrl = (path: string, params?: Record<string, string>) => {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value.trim() !== "") {
        url.searchParams.set(key, value);
      }
    });
  }
  return url.toString();
};

const getErrorMessage = async (res: Response) => {
  const raw = await res.text();

  let payload: ApiError | null = null;
  try {
    payload = raw ? (JSON.parse(raw) as ApiError) : null;
  } catch {
    payload = null;
  }

  const fieldErrors =
    payload && typeof payload.issues === "object" && payload.issues && "fieldErrors" in payload.issues
      ? (payload.issues as { fieldErrors?: Record<string, string[]> }).fieldErrors
      : undefined;

  const firstFieldError = fieldErrors
    ? Object.values(fieldErrors)
        .flat()
        .find((value) => Boolean(value))
    : undefined;

  const fallbackText = raw && !payload ? raw : "";

  return firstFieldError ?? payload?.message ?? payload?.error ?? (fallbackText || `Erro HTTP ${res.status}`);
};

const request = async <T>(
  path: string,
  init: RequestInit = {},
  params?: Record<string, string>
): Promise<T> => {
  const isFormDataPayload = init.body instanceof FormData;
  const headers = {
    ...(isFormDataPayload ? {} : { "Content-Type": "application/json" }),
    ...(init.headers ?? {})
  };

  let res: Response;
  try {
    res = await fetch(buildUrl(path, params), {
      ...init,
      headers
    });
  } catch (error) {
    console.error("[api] Network error", { path, method: init.method ?? "GET", error });
    throw error;
  }

  if (!res.ok) {
    const normalizedHeaders = headers as Record<string, string | undefined>;
    const hasAuthorization = Boolean(normalizedHeaders.Authorization ?? normalizedHeaders.authorization);
    if (res.status === 401 && hasAuthorization) {
      window.dispatchEvent(new CustomEvent("gestconv:auth-expired"));
    }
    throw new Error(await getErrorMessage(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
};

export const login = (email: string, senha: string) =>
  request<AuthResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, senha })
  });

export const register = (nome: string, email: string, senha: string, role: Role) =>
  request<AuthResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({ nome, email, senha, role })
  });

export const listUsersAdmin = (token: string) =>
  request<ManagedUser[]>("/api/v1/usuarios", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const createUserAdmin = (token: string, payload: { nome: string; email: string; senha: string; role: Role }) =>
  request<ManagedUser>("/api/v1/usuarios", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const updateUserAdmin = (
  token: string,
  id: number,
  payload: Partial<{ nome: string; email: string; senha: string; role: Role }>
) =>
  request<ManagedUser>(`/api/v1/usuarios/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const seedDemoDataAdmin = (token: string) =>
  request<{ message: string; instrumentos: number; repasses: number }>("/api/v1/usuarios/seed-demo", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listInstruments = (
  token: string,
  filters: InstrumentFilters
) =>
  request<Instrument[]>(
    "/api/v1/instrumentos",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      ativo: filters.ativo,
      status: filters.status,
      concedente: filters.concedente,
      convenete_id: filters.convenete_id,
      vigencia_de: filters.vigencia_de,
      vigencia_ate: filters.vigencia_ate
    }
  );

export const getInstrumentById = (token: string, id: number) =>
  request<Instrument>(`/api/v1/instrumentos/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getInstrumentChecklist = (token: string, instrumentId: number) =>
  request<ChecklistResponse>(`/api/v1/instrumentos/${instrumentId}/checklist`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const addChecklistItem = (
  token: string,
  instrumentId: number,
  payload: {
    nome_documento: string;
    etapa?: WorkflowStage;
    obrigatorio: boolean;
    observacao?: string;
    status?: ChecklistItemStatus;
  }
) =>
  request<ChecklistItem>(`/api/v1/instrumentos/${instrumentId}/checklist`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deleteChecklistItem = (token: string, instrumentId: number, itemId: number) =>
  request<void>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const updateChecklistItem = (
  token: string,
  instrumentId: number,
  itemId: number,
  payload: Partial<{
    etapa: WorkflowStage;
    status: ChecklistItemStatus;
    nome_documento: string;
    obrigatorio: boolean;
    observacao: string;
    ordem: number;
  }>
) =>
  request<ChecklistItem>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const getMyProfile = (token: string) =>
  request<User>("/api/v1/usuarios/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const uploadMyAvatar = async (token: string, file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  return request<User>("/api/v1/usuarios/me/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
};

export const removeMyAvatar = (token: string) =>
  request<void>("/api/v1/usuarios/me/avatar", {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const createChecklistExternalLink = (
  token: string,
  instrumentId: number,
  itemId: number,
  validadeDias = 7
) =>
  request<{
    token: string;
    ativo: boolean;
    expira_em: string;
    validade_dias: number;
    link_publico: string;
  }>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/external-link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ validade_dias: validadeDias })
  });

export const deactivateChecklistExternalLink = (token: string, instrumentId: number, itemId: number) =>
  request<{ message: string; desativados: number }>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/external-link`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listChecklistExternalFiles = (token: string, instrumentId: number, itemId: number) =>
  request<{ itens: ChecklistExternalFile[] }>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/external-files`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const downloadChecklistExternalFile = async (
  token: string,
  instrumentId: number,
  itemId: number,
  fileId: number,
  fallbackName = "arquivo"
) => {
  const res = await fetch(
    buildUrl(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/external-files/${fileId}/download`),
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

export const uploadChecklistItemFile = (token: string, instrumentId: number, itemId: number, file: File) => {
  const formData = new FormData();
  formData.append("arquivo", file);

  return request<ChecklistItem>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
};

export const removeChecklistItemFile = (token: string, instrumentId: number, itemId: number) =>
  request<ChecklistItem>(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/upload`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const downloadChecklistItemFile = async (
  token: string,
  instrumentId: number,
  itemId: number,
  fallbackName = "documento"
) => {
  const res = await fetch(buildUrl(`/api/v1/instrumentos/${instrumentId}/checklist/${itemId}/download`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

export const listStageFollowUps = (token: string, instrumentId: number, stage: WorkflowStage) =>
  request<StageFollowUpListResponse>(`/api/v1/instrumentos/${instrumentId}/stages/${stage}/follow-ups`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const createStageFollowUp = (
  token: string,
  instrumentId: number,
  stage: WorkflowStage,
  payload: {
    texto?: string;
    arquivos?: File[];
  }
) => {
  const formData = new FormData();
  if (payload.texto && payload.texto.trim() !== "") {
    formData.append("texto", payload.texto.trim());
  }
  for (const file of payload.arquivos ?? []) {
    formData.append("arquivos", file);
  }

  return request<StageFollowUp>(`/api/v1/instrumentos/${instrumentId}/stages/${stage}/follow-ups`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });
};

export const downloadStageFollowUpFile = async (
  token: string,
  instrumentId: number,
  stage: WorkflowStage,
  followUpId: number,
  fileId: number,
  fallbackName = "arquivo"
) => {
  const res = await fetch(
    buildUrl(`/api/v1/instrumentos/${instrumentId}/stages/${stage}/follow-ups/${followUpId}/files/${fileId}/download`),
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.click();
  URL.revokeObjectURL(url);
};

export const createInstrument = (token: string, payload: InstrumentPayload) =>
  request<Instrument>("/api/v1/instrumentos", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const updateInstrument = (token: string, id: number, payload: Partial<InstrumentPayload>) =>
  request<Instrument>(`/api/v1/instrumentos/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const addInstrumentRepasse = (
  token: string,
  instrumentId: number,
  payload: { data_repasse: string; valor_repasse: number }
) =>
  request<Instrument>(`/api/v1/instrumentos/${instrumentId}/repasses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deleteInstrumentRepasse = (token: string, instrumentId: number, repasseId: number) =>
  request<Instrument>(`/api/v1/instrumentos/${instrumentId}/repasses/${repasseId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listInstrumentRepasses = (token: string, instrumentId: number) =>
  request<{ itens: InstrumentRepasse[] }>(`/api/v1/instrumentos/${instrumentId}/repasses`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const deactivateInstrument = (token: string, id: number) =>
  request<void>(`/api/v1/instrumentos/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const listDeadlineAlerts = (token: string, limiteDias = 30) =>
  request<DeadlineAlertResponse>(
    "/api/v1/instrumentos/alerts/deadlines",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      limite_dias: String(limiteDias)
    }
  );

export const getWorkProgress = (token: string, instrumentId: number) =>
  request<WorkProgress>(`/api/v1/instrumentos/${instrumentId}/work-progress`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const updateWorkProgress = (token: string, instrumentId: number, percentualObra: number) =>
  request<{ percentual_obra: number }>(`/api/v1/instrumentos/${instrumentId}/work-progress`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ percentual_obra: percentualObra })
  });

export const addWorkMeasurementBulletin = (
  token: string,
  instrumentId: number,
  payload: {
    data_boletim: string;
    valor_medicao: number;
    percentual_obra_informado?: number;
    observacao?: string;
  }
) =>
  request(`/api/v1/instrumentos/${instrumentId}/work-progress/boletins`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deleteWorkMeasurementBulletin = (token: string, instrumentId: number, boletimId: number) =>
  request<void>(`/api/v1/instrumentos/${instrumentId}/work-progress/boletins/${boletimId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const healthCheck = () => request<HealthResponse>("/health");

export const listAuditLogs = (
  token: string,
  query: { instrumento_id?: number; acao?: AuditAction; limite?: number }
) =>
  request<AuditLogItem[]>(
    "/api/v1/auditoria",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      instrumento_id: query.instrumento_id ? String(query.instrumento_id) : "",
      acao: query.acao ?? "",
      limite: String(query.limite ?? 100)
    }
  );

export const listConvenetes = (token: string) =>
  request<Convenete[]>("/api/v1/convenetes", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const createConvenete = (token: string, payload: ConvenetePayload) =>
  request<Convenete>("/api/v1/convenetes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const updateConvenete = (token: string, id: number, payload: Partial<ConvenetePayload>) =>
  request<Convenete>(`/api/v1/convenetes/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const deleteConvenete = (token: string, id: number) =>
  request<void>(`/api/v1/convenetes/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const getRepasseReport = (
  token: string,
  query: { convenete_id: number; instrumento_id?: number; data_de?: string; data_ate?: string }
) =>
  request<RepasseReportResponse>(
    "/api/v1/relatorios/repasses",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      convenete_id: String(query.convenete_id),
      instrumento_id: query.instrumento_id ? String(query.instrumento_id) : "",
      data_de: query.data_de ?? "",
      data_ate: query.data_ate ?? ""
    }
  );

export const getObraReport = (
  token: string,
  query: {
    convenete_id?: number;
    instrumento_id?: number;
    status?: InstrumentStatus;
    ativo?: boolean;
    data_de?: string;
    data_ate?: string;
  }
) =>
  request<ObraReportResponse>(
    "/api/v1/relatorios/obras",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      convenete_id: query.convenete_id ? String(query.convenete_id) : "",
      instrumento_id: query.instrumento_id ? String(query.instrumento_id) : "",
      status: query.status ?? "",
      ativo: query.ativo === undefined ? "true" : String(query.ativo),
      data_de: query.data_de ?? "",
      data_ate: query.data_ate ?? ""
    }
  );

export const listTickets = (
  token: string,
  query?: {
    status?: TicketStatus;
    prioridade?: TicketPriority;
    origem?: TicketSource;
    somente_atrasados?: boolean;
    instrument_id?: number;
    responsavel_user_id?: number;
    q?: string;
  }
) =>
  request<Ticket[]>(
    "/api/v1/tickets",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    {
      status: query?.status ?? "",
      prioridade: query?.prioridade ?? "",
      origem: query?.origem ?? "",
      somente_atrasados: query?.somente_atrasados ? "true" : "",
      instrument_id: query?.instrument_id ? String(query.instrument_id) : "",
      responsavel_user_id: query?.responsavel_user_id ? String(query.responsavel_user_id) : "",
      q: query?.q ?? ""
    }
  );

export const getTicketById = (token: string, id: number) =>
  request<Ticket>(`/api/v1/tickets/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

export const createTicket = (
  token: string,
  payload: {
    titulo: string;
    descricao?: string;
    status?: TicketStatus;
    prioridade?: TicketPriority;
    prazo_alvo?: string;
    motivo_resolucao?: string;
    instrument_id?: number;
    instrumento_informado?: string;
    responsavel_user_id?: number;
  }
) =>
  request<Ticket>("/api/v1/tickets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const updateTicket = (
  token: string,
  id: number,
  payload: Partial<{
    titulo: string;
    descricao: string | null;
    status: TicketStatus;
    prioridade: TicketPriority;
    prazo_alvo: string | null;
    motivo_resolucao: string | null;
    instrument_id: number | null;
    instrumento_informado: string | null;
    responsavel_user_id: number | null;
  }>
) =>
  request<Ticket>(`/api/v1/tickets/${id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

export const addTicketComment = (token: string, id: number, mensagem: string) =>
  request<Ticket>(`/api/v1/tickets/${id}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ mensagem })
  });

export const toggleTicketChecklistItem = (token: string, ticketId: number, itemId: number, concluido: boolean) =>
  request<Ticket>(`/api/v1/tickets/${ticketId}/checklist/${itemId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ concluido })
  });

export const listTicketAssignableUsers = (token: string) =>
  request<{ itens: Array<{ id: number; nome: string; email: string; role: Role }> }>(
    "/api/v1/tickets/assignable-users",
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

export const associateTicketInstrument = (token: string, ticketId: number, instrumentId: number) =>
  request<{ success: boolean; ticket: Ticket; solicitacaoCaixa: unknown }>(
    `/api/v1/tickets/${ticketId}/instrumento`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ instrument_id: instrumentId })
    }
  );

export type SolicitacaoCaixaItem = {
  id: number;
  tipo: "EMAIL_RECEBIDO" | "COMENTARIO_TICKET" | "RESPOTA_ENVIADA" | "ASSOCIAÇÃO_MANUAL";
  descricao: string;
  origem_email: string | null;
  assunto_email: string | null;
  created_at: string;
  ticket: { id: number; codigo: string; titulo: string } | null;
};

export const listSolicitacoesCaixa = (token: string, instrumentId: number, options?: { tipo?: string; limit?: number; offset?: number }) => {
  const params: Record<string, string> = {};
  if (options?.tipo) params.tipo = options.tipo;
  if (options?.limit) params.limit = String(options.limit);
  if (options?.offset) params.offset = String(options.offset);
  return request<{ itens: SolicitacaoCaixaItem[]; total: number }>(
    `/api/v1/solicitacoes-caixa/instrumentos/${instrumentId}/solicitacoes`,
    {
      headers: { Authorization: `Bearer ${token}` },
      ...(Object.keys(params).length > 0 ? { params } : {})
    }
  );
};

export type InstrumentoSearchItem = {
  id: number;
  label: string;
  proposta: string | null;
  instrumento: string | null;
  objeto: string | null;
};

export const searchInstrumentos = (token: string, q: string) =>
  request<InstrumentoSearchItem[]>(`/api/v1/solicitacoes-caixa/instrumentos/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export type CertificateItem = {
  id: number;
  nome: string;
  titular: string;
  cpf: string;
  validade: string;
  status: "ATIVO" | "EXPIRADO" | "REVOGADO";
  createdAt: string;
  criado_por: { id: number; nome: string; email: string };
};

export const createCertificate = (
  token: string,
  payload: {
    nome: string;
    titular: string;
    cpf: string;
    validade: string;
    arquivo: string;
    senha: string;
  }
) =>
  request<CertificateItem>("/api/v1/certificates", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const listCertificates = (token: string, options?: { status?: string; limit?: number; offset?: number }) => {
  const params: Record<string, string> = {};
  if (options?.status) params.status = options.status;
  if (options?.limit) params.limit = String(options.limit);
  if (options?.offset) params.offset = String(options.offset);
  return request<{ certificados: CertificateItem[]; total: number }>("/api/v1/certificates", {
    headers: { Authorization: `Bearer ${token}` },
    ...(Object.keys(params).length > 0 ? { params } : {})
  });
};

export const getActiveCertificates = (token: string) =>
  request<{ id: number; nome: string; titular: string; cpf: string; validade: string }[]>(
    "/api/v1/certificates/ativos",
    { headers: { Authorization: `Bearer ${token}` } }
  );

export const getCertificateById = (token: string, id: number) =>
  request<any>(`/api/v1/certificates/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const revokeCertificate = (token: string, id: number) =>
  request<{ id: number; status: string }>(`/api/v1/certificates/${id}/revogar`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` }
  });

export type DocumentItem = {
  id: number;
  titulo: string;
  descricao: string | null;
  arquivoNome: string;
  status: "PENDENTE" | "ASSINADO" | "CANCELADO";
  indexStatus?: "PENDENTE" | "PROCESSANDO" | "INDEXADO" | "ERRO";
  indexedAt?: string | null;
  indexError?: string | null;
  aiSummary?: string | null;
  aiKeywords?: string | null;
  aiCategory?: "CONTRATO" | "OFICIO" | "RELATORIO" | "PRESTACAO_CONTAS" | "COMPROVANTE" | "OUTROS" | null;
  aiRiskLevel?: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO" | null;
  aiClassificationConfidence?: number | null;
  aiInsights?: string | null;
  createdAt: string;
  criado_por: { id: number; nome: string; email: string };
  assinaturas: any[];
};

export const createDocument = (
  token: string,
  payload: { titulo: string; descricao?: string; arquivo: File; arquivo_nome?: string }
) => {
  const formData = new FormData();
  formData.append("titulo", payload.titulo);
  if (payload.descricao?.trim()) {
    formData.append("descricao", payload.descricao.trim());
  }
  formData.append("arquivo", payload.arquivo);
  if (payload.arquivo_nome?.trim()) {
    formData.append("arquivo_nome", payload.arquivo_nome.trim());
  }

  return request<DocumentItem>("/api/v1/documents", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
};

export const listDocuments = (token: string, options?: { status?: string; limit?: number; offset?: number }) => {
  const params: Record<string, string> = {};
  if (options?.status) params.status = options.status;
  if (options?.limit) params.limit = String(options.limit);
  if (options?.offset) params.offset = String(options.offset);
  return request<{ documentos: DocumentItem[]; total: number }>("/api/v1/documents", {
    headers: { Authorization: `Bearer ${token}` }
  }, params);
};

export const searchDocuments = (
  token: string,
  query: {
    q: string;
    status?: "PENDENTE" | "ASSINADO" | "CANCELADO";
    created_by_user_id?: number;
    data_de?: string;
    data_ate?: string;
    limit?: number;
  }
) =>
  request<DocumentSearchResponse>(
    "/api/v1/documents/search",
    {
      headers: { Authorization: `Bearer ${token}` }
    },
    {
      q: query.q,
      status: query.status ?? "",
      created_by_user_id: query.created_by_user_id ? String(query.created_by_user_id) : "",
      data_de: query.data_de ?? "",
      data_ate: query.data_ate ?? "",
      limit: query.limit ? String(query.limit) : ""
    }
  );

export const searchDocumentsSemantic = (
  token: string,
  query: {
    q: string;
    status?: "PENDENTE" | "ASSINADO" | "CANCELADO";
    created_by_user_id?: number;
    data_de?: string;
    data_ate?: string;
    limit?: number;
  }
) =>
  request<DocumentSearchResponse>(
    "/api/v1/documents/search-semantic",
    {
      headers: { Authorization: `Bearer ${token}` }
    },
    {
      q: query.q,
      status: query.status ?? "",
      created_by_user_id: query.created_by_user_id ? String(query.created_by_user_id) : "",
      data_de: query.data_de ?? "",
      data_ate: query.data_ate ?? "",
      limit: query.limit ? String(query.limit) : ""
    }
  );

export const reindexDocument = (token: string, id: number) =>
  request<{ message: string }>(`/api/v1/documents/${id}/reindex`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

export const askDocumentQuestion = (token: string, id: number, pergunta: string) =>
  request<DocumentQaResponse>(`/api/v1/documents/${id}/ask`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ pergunta })
  });

export const applyDocumentOcrText = (token: string, id: number, texto: string) =>
  request<{ message: string }>(`/api/v1/documents/${id}/ocr-text`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ texto })
  });

export const classifyDocument = (token: string, id: number) =>
  request<{ message: string }>(`/api/v1/documents/${id}/classify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

export const getPendingDocuments = (token: string) =>
  request<{ id: number; titulo: string; arquivoNome: string; createdAt: string; createdByUser: { id: number; nome: string } }[]>(
    "/api/v1/documents/pendentes",
    { headers: { Authorization: `Bearer ${token}` } }
  );

export const getDocumentById = (token: string, id: number) =>
  request<DocumentItem>(`/api/v1/documents/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const deleteDocument = (token: string, id: number) =>
  request<{ message: string }>(`/api/v1/documents/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

export const signDocument = (
  token: string,
  payload: { document_id: number; certificate_id: number; senha: string }
) =>
  request<{ message: string; signature_id: number; assinado_em: string }>("/api/v1/signature/sign", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

export const getDocumentSignatureHistory = (token: string, documentId: number) =>
  request<any[]>(`/api/v1/signature/documento/${documentId}/historico`, {
    headers: { Authorization: `Bearer ${token}` }
  });

export const downloadDocument = async (token: string, id: number, fallbackName = "documento.pdf") => {
  const res = await fetch(buildUrl(`/api/v1/documents/${id}/download`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    throw new Error(await getErrorMessage(res));
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fallbackName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
