import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  addChecklistItem,
  createConvenete,
  createInstrument,
  deleteConvenete,
  deactivateInstrument,
  deleteChecklistItem,
  downloadChecklistItemFile,
  getInstrumentById,
  getInstrumentChecklist,
  healthCheck,
  listAuditLogs,
  listConvenetes,
  listDeadlineAlerts,
  listInstruments,
  login,
  removeChecklistItemFile,
  register,
  uploadChecklistItemFile,
  updateConvenete,
  updateInstrument
} from "./api";
import type {
  AuditAction,
  AuditLogItem,
  ChecklistItem,
  ChecklistSummary,
  Convenete,
  ConvenetePayload,
  DeadlineAlertItem,
  Instrument,
  InstrumentFilters,
  InstrumentPayload,
  InstrumentStatus,
  Role,
  User
} from "./types";

const TOKEN_KEY = "gestconv360.token";
const USER_KEY = "gestconv360.user";

const STATUS_OPTIONS: InstrumentStatus[] = [
  "EM_ELABORACAO",
  "ASSINADO",
  "EM_EXECUCAO",
  "VENCIDO",
  "PRESTACAO_PENDENTE",
  "CONCLUIDO"
];

const AUDIT_ACTION_OPTIONS: AuditAction[] = ["CREATE", "UPDATE", "DEACTIVATE"];

type AuthMode = "login" | "register";
type MenuView = "dashboard" | "instrumentos" | "convenetes" | "auditoria";

type ConveneteForm = ConvenetePayload;

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

const blankFilters = (): InstrumentFilters => ({
  status: "",
  concedente: "",
  ativo: "true",
  vigencia_de: "",
  vigencia_ate: ""
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

const readStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
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
  const columns: Array<keyof Instrument> = [
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
  ];

  const header = columns.map((col) => toCsvCell(col)).join(";");
  const rows = items.map((item) => columns.map((col) => toCsvCell(item[col])).join(";"));
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

export default function App() {
  const logoSrc = "/logo-gestconv-novo.png";

  const [healthStatus, setHealthStatus] = useState<"checking" | "ok" | "error">("checking");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
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
  const [nome, setNome] = useState("");
  const [role, setRole] = useState<Role>("CONSULTA");

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
  const [busyChecklistItemId, setBusyChecklistItemId] = useState<number | null>(null);

  const [convenetes, setConvenetes] = useState<Convenete[]>([]);
  const [conveneteForm, setConveneteForm] = useState<ConveneteForm>(() => emptyConveneteForm());
  const [editingConveneteId, setEditingConveneteId] = useState<number | null>(null);

  const isAuthenticated = Boolean(token && user);
  const canManageInstruments = user?.role === "ADMIN" || user?.role === "GESTOR";
  const canDeactivateInstruments = user?.role === "ADMIN";
  const isInstrumentProfileView = activeView === "instrumentos" && instrumentPageId !== null;

  const sortedInstruments = useMemo(() => [...instruments].sort((a, b) => a.id - b.id), [instruments]);
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

  useEffect(() => {
    healthCheck()
      .then(() => setHealthStatus("ok"))
      .catch(() => setHealthStatus("error"));
  }, []);

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
    setEditingId(null);
    setShowCreateInstrumentForm(false);
    setForm(emptyInstrumentForm());
    setConvenetes([]);
    setEditingConveneteId(null);
    setConveneteForm(emptyConveneteForm());
    setFilters(blankFilters());
    setInstrumentPageId(null);
    if (window.location.pathname !== "/") {
      window.history.replaceState({}, "", "/");
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const navigateToInstrumentList = () => {
    setInstrumentPageId(null);
    setChecklistItems([]);
    setChecklistSummary(null);
    if (window.location.pathname !== "/") {
      window.history.pushState({}, "", "/");
    }
  };

  const navigateToInstrumentProfile = (id: number) => {
    const nextPath = `/instrumentos/${id}`;
    setInstrumentPageId(id);
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

  const loadChecklist = async (instrumentId: number, authToken?: string) => {
    const currentToken = authToken ?? token;
    if (!currentToken) {
      return;
    }

    const data = await getInstrumentChecklist(currentToken, instrumentId);
    setChecklistItems(data.itens);
    setChecklistSummary(data.resumo);
  };

  const refreshData = async (authToken?: string) => {
    setIsBusy(true);
    setMessage("");
    try {
      await Promise.all([loadInstruments(authToken), loadDashboard(authToken), loadAuditTrail(authToken)]);
      try {
        await loadConvenetes(authToken);
      } catch {
        // Intencionalmente ignorado para nao bloquear o modulo de instrumentos.
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
  }, [isAuthenticated]);

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
      return;
    }

    loadChecklist(instrumentPageId, token).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar checklist.");
    });
  }, [instrumentPageId, isAuthenticated, token]);

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

  const onUploadChecklistFile = async (itemId: number, file: File | null) => {
    if (!token || instrumentPageId === null || !file) {
      return;
    }

    setBusyChecklistItemId(itemId);
    setMessage("");
    try {
      await uploadChecklistItemFile(token, instrumentPageId, itemId, file);
      await loadChecklist(instrumentPageId);
      setMessage("Documento enviado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no upload do documento.");
    } finally {
      setBusyChecklistItemId(null);
    }
  };

  const onRemoveChecklistFile = async (itemId: number) => {
    if (!token || instrumentPageId === null) {
      return;
    }

    setBusyChecklistItemId(itemId);
    setMessage("");
    try {
      await removeChecklistItemFile(token, instrumentPageId, itemId);
      await loadChecklist(instrumentPageId);
      setMessage("Arquivo removido do checklist.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao remover arquivo.");
    } finally {
      setBusyChecklistItemId(null);
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

  const onDownloadChecklistFile = async (item: ChecklistItem) => {
    if (!token || instrumentPageId === null || !item.arquivo) {
      return;
    }

    try {
      await downloadChecklistItemFile(token, instrumentPageId, item.id, item.arquivo.nome_original);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao baixar arquivo.");
    }
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

  const onRegister = async (event: FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setMessage("");
    try {
      const auth = await register(nome, email, senha, role);
      persistAuth(auth.access_token, auth.user);
      await refreshData(auth.access_token);
      setMessage(`Conta criada para ${auth.user.nome}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no cadastro.");
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
            <p className="eyebrow">Painel Operacional</p>
            <h1>Gestconv360</h1>
            <p className="subtitle">Acesso ao modulo de instrumentos e propostas.</p>
          </div>
          <div className={`health health-${healthStatus}`}>
            API: {healthStatus === "checking" ? "verificando" : healthStatus === "ok" ? "online" : "offline"}
          </div>
        </header>

        <section className="card auth-card">
          <img className="auth-logo" src={logoSrc} alt="Logo Gestconv360" />
          <div className="tab-row">
            <button
              type="button"
              className={authMode === "login" ? "tab active" : "tab"}
              onClick={() => setAuthMode("login")}
            >
              Entrar
            </button>
            <button
              type="button"
              className={authMode === "register" ? "tab active" : "tab"}
              onClick={() => setAuthMode("register")}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={authMode === "login" ? onLogin : onRegister} className="form-grid">
            {authMode === "register" && (
              <label>
                Nome
                <input value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} required />
              </label>
            )}

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

            {authMode === "register" && (
              <label>
                Perfil
                <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="ADMIN">ADMIN</option>
                  <option value="GESTOR">GESTOR</option>
                  <option value="CONSULTA">CONSULTA</option>
                </select>
              </label>
            )}

            <button type="submit" disabled={isBusy}>
              {isBusy ? "Processando..." : authMode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
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
          <button
            type="button"
            className={activeView === "auditoria" ? "menu-item active" : "menu-item"}
            onClick={() => onChangeView("auditoria")}
          >
            Auditoria/Historico
          </button>

          <div className="sidebar-footer">
            <p>{user?.nome}</p>
            <p>{user?.role}</p>
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
                    : "Auditoria e Historico"}
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

          {activeView === "dashboard" ? (
            <section className="dashboard-grid">
              <div className="card kpi-card">
                <p className="eyebrow">Registros</p>
                <h3>{dashboard.totalRegistros}</h3>
              </div>
              <div className="card kpi-card">
                <p className="eyebrow">Ativos</p>
                <h3>{dashboard.ativos}</h3>
              </div>
              <div className="card kpi-card">
                <p className="eyebrow">Inativos</p>
                <h3>{dashboard.inativos}</h3>
              </div>
              <div className="card kpi-card">
                <p className="eyebrow">Alertas (30 dias)</p>
                <h3>{dashboard.alertas}</h3>
              </div>

              <div className="card wide-card">
                <h3>Valor global</h3>
                <p className="total-value">{formatCurrency(dashboard.valorTotal)}</p>
                <div className="action-row">
                  <button type="button" onClick={() => refreshData()} disabled={isBusy}>
                    Atualizar dashboard
                  </button>
                  <button type="button" className="secondary" onClick={() => exportCsv(overviewItems)}>
                    Exportar CSV
                  </button>
                  <button type="button" className="secondary" onClick={() => exportExcel(overviewItems)}>
                    Exportar Excel
                  </button>
                </div>
              </div>

              <div className="card wide-card">
                <h3>Status dos instrumentos</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.porStatus.map((item) => (
                        <tr key={item.status}>
                          <td>{item.status}</td>
                          <td>{item.quantidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                <div className="filters-grid columns-5">
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
                    <input
                      value={filters.concedente}
                      onChange={(e) => setFilters((prev) => ({ ...prev, concedente: e.target.value }))}
                    />
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
                <>
                  <div className="card profile-card">
                    <div className="profile-header-row">
                      <h3>{profileInstrument ? `Instrumento ${profileInstrument.instrumento}` : "Carregando instrumento"}</h3>
                      <div className="action-row compact">
                        <button type="button" className="ghost" onClick={navigateToInstrumentList}>
                          Voltar para lista
                        </button>
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
                          <strong>Concedente:</strong> {profileInstrument.concedente}
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

                        <div className="checklist-card">
                        <div className="checklist-head">
                          <h3>Checklist de celebracao</h3>
                          {checklistSummary && (
                            <p className="subtitle">
                              {checklistSummary.concluidos}/{checklistSummary.total} concluidos | obrigatorios: {" "}
                              {checklistSummary.obrigatorios_concluidos}/{checklistSummary.obrigatorios}
                            </p>
                          )}
                        </div>

                        {canManageInstruments && (
                          <form className="checklist-add-form" onSubmit={onAddChecklistItem}>
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
                          <div className="checklist-list">
                            {checklistItems.map((item) => (
                              <article key={item.id} className="checklist-item">
                                <div>
                                  <p className="checklist-title">
                                    <span className={item.concluido ? "check-status done" : "check-status"}>
                                      {item.concluido ? "✓" : "○"}
                                    </span>
                                    {item.nome_documento}
                                    {item.obrigatorio && <span className="check-required">Obrigatorio</span>}
                                  </p>
                                  {item.observacao && <p className="subtitle">{item.observacao}</p>}
                                  <p className="subtitle">
                                    {item.arquivo ? `Arquivo: ${item.arquivo.nome_original}` : "Sem arquivo enviado"}
                                  </p>
                                </div>
                                <div className="action-row compact checklist-actions">
                                  {canManageInstruments && (
                                    <label className="ghost upload-trigger">
                                      Upload
                                      <input
                                        type="file"
                                        onChange={(e) => onUploadChecklistFile(item.id, e.target.files?.[0] ?? null)}
                                        disabled={busyChecklistItemId === item.id}
                                      />
                                    </label>
                                  )}
                                  {item.arquivo && (
                                    <button
                                      type="button"
                                      className="secondary"
                                      onClick={() => onDownloadChecklistFile(item)}
                                      disabled={busyChecklistItemId === item.id}
                                    >
                                      Baixar
                                    </button>
                                  )}
                                  {canManageInstruments && item.arquivo && (
                                    <button
                                      type="button"
                                      className="ghost"
                                      onClick={() => onRemoveChecklistFile(item.id)}
                                      disabled={busyChecklistItemId === item.id}
                                    >
                                      Remover arquivo
                                    </button>
                                  )}
                                  {canManageInstruments && (
                                    <button
                                      type="button"
                                      className="danger"
                                      onClick={() => onDeleteChecklistItem(item.id)}
                                      disabled={busyChecklistItemId === item.id}
                                    >
                                      Excluir item
                                    </button>
                                  )}
                                </div>
                              </article>
                            ))}
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
                                Pendencias: {checklistSummary?.pendentes_obrigatorios.join(", ") || "adicione itens obrigatorios"}
                              </p>
                            )}
                          </div>
                        )}
                        </div>
                      </>
                    )}
                  </div>

                  {canManageInstruments && profileInstrument && editingId === profileInstrument.id && renderInstrumentForm()}
                </>
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
          ) : (
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
          )}

          {message && <p className="message">{message}</p>}
        </main>
      </div>
    </div>
  );
}
