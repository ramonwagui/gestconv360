import type {
  ApiError,
  AuditAction,
  AuditLogItem,
  AuthResponse,
  ChecklistItem,
  ChecklistResponse,
  Convenete,
  ConvenetePayload,
  DeadlineAlertResponse,
  InstrumentFilters,
  InstrumentPayload,
  Instrument,
  Role
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
  payload: { nome_documento: string; obrigatorio: boolean; observacao?: string }
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

export const healthCheck = () => request<{ status: string }>("/health");

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
