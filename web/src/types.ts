export type Role = "ADMIN" | "GESTOR" | "CONSULTA";

export type User = {
  id: number;
  nome: string;
  email: string;
  role: Role;
};

export type AuthResponse = {
  user: User;
  token_type: "Bearer";
  access_token: string;
};

export type InstrumentStatus =
  | "EM_ELABORACAO"
  | "ASSINADO"
  | "EM_EXECUCAO"
  | "VENCIDO"
  | "PRESTACAO_PENDENTE"
  | "CONCLUIDO";

export type Instrument = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  valor_repasse: number;
  valor_contrapartida: number;
  valor_total: number;
  data_cadastro: string | null;
  data_assinatura: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  data_prestacao_contas: string | null;
  data_dou: string | null;
  concedente: string;
  convenete_id: number | null;
  status: InstrumentStatus;
  responsavel: string | null;
  orgao_executor: string | null;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type InstrumentFilters = {
  status: InstrumentStatus | "";
  concedente: string;
  ativo: "true" | "false";
  vigencia_de: string;
  vigencia_ate: string;
};

export type InstrumentPayload = {
  proposta: string;
  instrumento: string;
  objeto: string;
  valor_repasse: number;
  valor_contrapartida: number;
  data_cadastro: string;
  data_assinatura?: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  data_prestacao_contas?: string;
  data_dou?: string;
  concedente: string;
  convenete_id?: number;
  status: InstrumentStatus;
  responsavel?: string;
  orgao_executor?: string;
  observacoes?: string;
};

export type ChecklistItemFile = {
  nome_original: string;
  mime_type: string | null;
  tamanho: number | null;
  uploaded_at: string | null;
  download_path: string;
};

export type ChecklistItem = {
  id: number;
  nome_documento: string;
  obrigatorio: boolean;
  concluido: boolean;
  observacao: string | null;
  ordem: number;
  arquivo: ChecklistItemFile | null;
  created_at: string;
  updated_at: string;
};

export type ChecklistSummary = {
  total: number;
  obrigatorios: number;
  concluidos: number;
  obrigatorios_concluidos: number;
  pode_iniciar_execucao: boolean;
  pendentes_obrigatorios: string[];
};

export type ChecklistResponse = {
  resumo: ChecklistSummary;
  itens: ChecklistItem[];
};

export type ApiError = {
  message?: string;
  error?: string;
  path?: string;
  issues?: unknown;
};

export type DeadlineAlertItem = {
  instrumento_id: number;
  proposta: string;
  instrumento: string;
  concedente: string;
  dias_para_vigencia_fim: number;
  dias_para_prestacao_contas: number | null;
};

export type DeadlineAlertResponse = {
  referencia: string;
  limite_dias: number;
  itens: DeadlineAlertItem[];
};

export type AuditAction = "CREATE" | "UPDATE" | "DEACTIVATE";

export type AuditLogItem = {
  id: number;
  instrumento_id: number;
  user_id: number | null;
  user_email: string;
  acao: AuditAction;
  campos_alterados: string[] | null;
  antes: unknown;
  depois: unknown;
  created_at: string;
};

export type Convenete = {
  id: number;
  nome: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cep: string;
  uf: string;
  cidade: string;
  tel: string;
  email: string;
  created_at: string;
  updated_at: string;
};

export type ConvenetePayload = {
  nome: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cep: string;
  uf: string;
  cidade: string;
  tel: string;
  email: string;
};
