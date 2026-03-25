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
  DeadlineAlertResponse,
  InstrumentFilters,
  InstrumentRepasse,
  InstrumentPayload,
  Instrument,
  ManagedUser,
  HealthResponse,
  Role,
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

  const res = await fetch(buildUrl(path, params), {
    ...init,
    headers
  });

  if (!res.ok) {
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
