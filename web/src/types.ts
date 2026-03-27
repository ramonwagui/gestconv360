export type Role = "ADMIN" | "GESTOR" | "CONSULTA";

export type User = {
  id: number;
  nome: string;
  email: string;
  role: Role;
  avatar_url: string | null;
};

export type ManagedUser = {
  id: number;
  nome: string;
  email: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
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

export type InstrumentFlowType = "OBRA" | "AQUISICAO_EQUIPAMENTOS" | "EVENTOS";

export type Instrument = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  valor_repasse: number;
  valor_contrapartida: number;
  valor_ja_repassado: number;
  percentual_repassado: number;
  repasses: InstrumentRepasse[];
  valor_total: number;
  data_cadastro: string | null;
  data_assinatura: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  data_prestacao_contas: string | null;
  data_dou: string | null;
  concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  fluxo_tipo: InstrumentFlowType;
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
  convenete_id: string;
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
  banco?: string;
  agencia?: string;
  conta?: string;
  fluxo_tipo?: InstrumentFlowType;
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

export type InstrumentRepasse = {
  id: number;
  data_repasse: string;
  valor_repasse: number;
  created_at: string;
  updated_at: string;
};

export type ChecklistExternalRequest = {
  token: string;
  ativo: boolean;
  expira_em: string;
  link_publico: string;
  arquivos_recebidos: number;
};

export type ChecklistExternalFile = {
  id: number;
  nome_remetente: string;
  nome_original: string;
  mime_type: string | null;
  tamanho: number | null;
  created_at: string;
  origem_link_ativo: boolean;
  origem_link_expira_em: string | null;
  download_path: string;
};

export type WorkflowStage =
  | "PROPOSTA"
  | "REQUISITOS_CELEBRACAO"
  | "PROJETO_BASICO_TERMO_REFERENCIA"
  | "PROCESSO_EXECUCAO_LICITACAO"
  | "VERIFICACAO_PROCESSO_LICITATORIO"
  | "INSTRUMENTOS_CONTRATUAIS"
  | "ACOMPANHAMENTO_OBRA";

export type ChecklistItemStatus = "NAO_INICIADO" | "EM_ELABORACAO" | "CONCLUIDO" | "ACEITO";

export type ChecklistItem = {
  id: number;
  etapa: WorkflowStage;
  status: ChecklistItemStatus;
  status_label: string;
  nome_documento: string;
  obrigatorio: boolean;
  concluido: boolean;
  observacao: string | null;
  ordem: number;
  arquivo: ChecklistItemFile | null;
  solicitacao_externa: ChecklistExternalRequest | null;
  anexos_externos: ChecklistExternalFile[];
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
  etapa_atual: WorkflowStage | null;
  etapas: Array<{
    etapa: WorkflowStage;
    total: number;
    obrigatorios: number;
    concluidos: number;
    obrigatorios_concluidos: number;
    concluida: boolean;
    pendentes_obrigatorios: string[];
  }>;
};

export type ChecklistResponse = {
  resumo: ChecklistSummary;
  itens: ChecklistItem[];
};

export type StageFollowUpFile = {
  id: number;
  nome_original: string;
  mime_type: string | null;
  tamanho: number | null;
  created_at: string;
  download_path: string;
};

export type StageFollowUp = {
  id: number;
  etapa: WorkflowStage;
  texto: string | null;
  user: {
    id: number | null;
    nome: string | null;
    email: string;
    avatar_url: string | null;
  };
  arquivos: StageFollowUpFile[];
  created_at: string;
  updated_at: string;
};

export type StageFollowUpListResponse = {
  itens: StageFollowUp[];
};

export type WorkMeasurementBulletin = {
  id: number;
  data_boletim: string;
  valor_medicao: number;
  percentual_obra_informado: number | null;
  observacao: string | null;
  created_at: string;
};

export type WorkProgress = {
  percentual_obra: number;
  valor_total_boletins: number;
  boletins: WorkMeasurementBulletin[];
};

export type ApiError = {
  message?: string;
  error?: string;
  path?: string;
  issues?: unknown;
};

export type HealthResponse = {
  status: string;
  version?: string;
  timestamp?: string;
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

export type TicketStatus = "ABERTO" | "EM_ANDAMENTO" | "RESOLVIDO" | "CANCELADO";
export type TicketSource = "MANUAL" | "EMAIL";
export type TicketPriority = "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

export type TicketUserRef = {
  id: number;
  nome: string;
  email: string;
  role: Role;
};

export type TicketInstrumentRef = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  status: InstrumentStatus;
};

export type TicketComment = {
  id: number;
  mensagem: string;
  created_at: string;
  updated_at: string;
  user: TicketUserRef;
};

export type TicketChecklistItem = {
  id: number;
  descricao: string;
  concluido: boolean;
  concluido_em: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
};

export type Ticket = {
  id: number;
  codigo: string;
  titulo: string;
  descricao: string | null;
  status: TicketStatus;
  prioridade: TicketPriority;
  origem: TicketSource;
  prazo_alvo: string | null;
  resolvido_em: string | null;
  motivo_resolucao: string | null;
  instrumento_informado: string | null;
  instrumento_encontrado: boolean;
  instrumento: TicketInstrumentRef | null;
  responsavel: TicketUserRef | null;
  criado_por: TicketUserRef;
  comentarios: TicketComment[];
  checklist_itens: TicketChecklistItem[];
  created_at: string;
  updated_at: string;
};

export type DocumentIndexStatus = "PENDENTE" | "PROCESSANDO" | "INDEXADO" | "ERRO";
export type DocumentAiCategory = "CONTRATO" | "OFICIO" | "RELATORIO" | "PRESTACAO_CONTAS" | "COMPROVANTE" | "OUTROS";
export type DocumentAiRiskLevel = "BAIXO" | "MEDIO" | "ALTO" | "CRITICO";

export type DocumentSearchResult = {
  id: number;
  titulo: string;
  descricao: string | null;
  arquivoNome: string;
  status: "PENDENTE" | "ASSINADO" | "CANCELADO";
  indexStatus: DocumentIndexStatus;
  aiSummary: string | null;
  aiKeywords: string | null;
  aiCategory: DocumentAiCategory | null;
  aiRiskLevel: DocumentAiRiskLevel | null;
  aiClassificationConfidence: number | null;
  aiInsights: string | null;
  createdAt: string;
  updatedAt: string;
  criado_por: {
    id: number;
    nome: string;
    email: string;
  };
  matched_chunks: number;
  score: number;
  snippet: string;
  searchType?: "lexical" | "semantic";
};

export type DocumentSearchResponse = {
  query: string;
  total: number;
  resultados: DocumentSearchResult[];
};

export type DocumentQaSource = {
  chunkIndex: number;
  score: number;
  snippet: string;
};

export type DocumentQaResponse = {
  resposta: string;
  fontes: DocumentQaSource[];
};

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

export type RepasseReportFilters = {
  convenete_id: number;
  convenete_nome: string;
  convenete_cnpj: string;
  instrumento_id: number | null;
  data_de: string | null;
  data_ate: string | null;
};

export type RepasseReportKpis = {
  instrumentos: number;
  quantidade_repasses: number;
  valor_repassado_periodo: number;
  ticket_medio_repasse: number;
  valor_pactuado: number;
  valor_ja_repassado: number;
  saldo_pactuado: number;
  percentual_repassado: number;
};

export type RepasseReportMonthlyPoint = {
  mes: string;
  valor: number;
};

export type RepasseReportByInstrumentPoint = {
  instrumento_id: number;
  instrumento: string;
  proposta: string;
  valor: number;
};

export type RepasseReportByStatusPoint = {
  status: InstrumentStatus;
  quantidade: number;
};

export type RepasseReportInstrument = {
  id: number;
  proposta: string;
  instrumento: string;
  status: InstrumentStatus;
  data_prestacao_contas: string | null;
  orgao_concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  empresa_vencedora: string | null;
  valor_pactuado: number;
  valor_ja_repassado: number;
  valor_repassado_periodo: number;
  saldo_pactuado: number;
  percentual_obra: number | null;
};

export type RepasseReportRepasse = {
  id: number;
  instrumento_id: number;
  proposta: string;
  instrumento: string;
  data_repasse: string;
  valor_repasse: number;
  empresa_vencedora: string | null;
};

export type RepasseReportResponse = {
  filtros: RepasseReportFilters;
  kpis: RepasseReportKpis;
  series: {
    repasses_mensais: RepasseReportMonthlyPoint[];
    repasses_por_instrumento: RepasseReportByInstrumentPoint[];
    instrumentos_por_status: RepasseReportByStatusPoint[];
  };
  instrumentos: RepasseReportInstrument[];
  repasses: RepasseReportRepasse[];
};

export type ObraReportFilters = {
  convenete_id: number | null;
  instrumento_id: number | null;
  status: InstrumentStatus | null;
  ativo: boolean;
  data_de: string | null;
  data_ate: string | null;
};

export type ObraReportKpis = {
  obras_monitoradas: number;
  percentual_medio_obra: number;
  valor_total_boletins_periodo: number;
  valor_total_repasses_periodo: number;
  obras_risco_alto: number;
};

export type ObraReportMonthlyPoint = {
  mes: string;
  valor: number;
};

export type ObraReportByStatusPoint = {
  status: InstrumentStatus;
  quantidade: number;
};

export type ObraReportInstrument = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  status: InstrumentStatus;
  convenete_id: number | null;
  convenete_nome: string | null;
  orgao_concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  data_prestacao_contas: string | null;
  vigencia_fim: string;
  dias_para_vigencia_fim: number;
  percentual_obra: number;
  valor_pactuado: number;
  valor_ja_repassado: number;
  valor_boletins_periodo: number;
  valor_repasses_periodo: number;
  ultimo_boletim_data: string | null;
  ultimo_boletim_valor: number | null;
  risco: "BAIXO" | "MEDIO" | "ALTO";
};

export type ObraReportResponse = {
  filtros: ObraReportFilters;
  kpis: ObraReportKpis;
  series: {
    boletins_mensais: ObraReportMonthlyPoint[];
    repasses_mensais: ObraReportMonthlyPoint[];
    obras_por_status: ObraReportByStatusPoint[];
  };
  instrumentos: ObraReportInstrument[];
};
