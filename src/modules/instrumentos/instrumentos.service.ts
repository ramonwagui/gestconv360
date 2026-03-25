import { ChecklistItemStatus, InstrumentFlowType, InstrumentWorkflowStage, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  ChecklistItemCreateInput,
  ChecklistItemUpdateInput,
  CreateInstrumentInput,
  ListQueryInput,
  MeasurementCreateInput,
  RepasseCreateInput,
  UpdateInstrumentInput,
  WorkProgressUpdateInput
} from "./instrumentos.schema";

const checklistExternalLinkInclude = {
  externalLinks: {
    orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }],
    include: {
      files: {
        orderBy: [{ createdAt: "desc" as const }, { id: "desc" as const }]
      }
    }
  }
};

const instrumentRepasseInclude = {
  repasses: {
    orderBy: [{ dataRepasse: "desc" as const }, { id: "desc" as const }]
  }
};

const toDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}T00:00:00.000Z`);
};

const STAGE_ORDER: InstrumentWorkflowStage[] = [
  InstrumentWorkflowStage.PROPOSTA,
  InstrumentWorkflowStage.REQUISITOS_CELEBRACAO,
  InstrumentWorkflowStage.PROJETO_BASICO_TERMO_REFERENCIA,
  InstrumentWorkflowStage.PROCESSO_EXECUCAO_LICITACAO,
  InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO,
  InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS,
  InstrumentWorkflowStage.ACOMPANHAMENTO_OBRA
];

const PROPOSTA_DEFAULT_ITEMS: Array<{ nome: string; obrigatorio: boolean }> = [
  { nome: "Caracterizacao dos interesses reciprocos", obrigatorio: true },
  { nome: "Publico alvo", obrigatorio: true },
  { nome: "Problema a ser resolvido", obrigatorio: true },
  { nome: "Resultados esperados", obrigatorio: true },
  { nome: "Relacao entre a proposta e os objetivos e diretrizes do programa", obrigatorio: true },
  { nome: "Objeto do instrumento", obrigatorio: true },
  { nome: "Crono fisico financeiro", obrigatorio: true },
  { nome: "Crono desembolso", obrigatorio: true },
  { nome: "Plano de aplicacao detalhado", obrigatorio: true }
];

type FlowDefinition = {
  stages: InstrumentWorkflowStage[];
  defaultStageItems: Record<InstrumentWorkflowStage, Array<{ nome: string; obrigatorio: boolean }>>;
};

const FLOW_DEFINITIONS: Record<InstrumentFlowType, FlowDefinition> = {
  [InstrumentFlowType.OBRA]: {
    stages: STAGE_ORDER,
    defaultStageItems: {
      [InstrumentWorkflowStage.PROPOSTA]: PROPOSTA_DEFAULT_ITEMS,
      [InstrumentWorkflowStage.REQUISITOS_CELEBRACAO]: [{ nome: "Documentacao", obrigatorio: true }],
      [InstrumentWorkflowStage.PROJETO_BASICO_TERMO_REFERENCIA]: [
        { nome: "Declaracoes", obrigatorio: true },
        { nome: "Projeto", obrigatorio: true },
        { nome: "Documentacao", obrigatorio: true },
        { nome: "Licenca ambiental", obrigatorio: true },
        { nome: "QCI", obrigatorio: true },
        { nome: "Planilha orcamentaria", obrigatorio: true }
      ],
      [InstrumentWorkflowStage.PROCESSO_EXECUCAO_LICITACAO]: [
        { nome: "Documentacao referente ao processo licitatorio", obrigatorio: true }
      ],
      [InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO]: [
        { nome: "Documentacao para verificacao do processo licitatorio (VRPL)", obrigatorio: true }
      ],
      [InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS]: [{ nome: "Documento", obrigatorio: true }],
      [InstrumentWorkflowStage.ACOMPANHAMENTO_OBRA]: [
        { nome: "ART de execucao", obrigatorio: true },
        { nome: "ART de fiscalizacao", obrigatorio: true },
        { nome: "Ordem de servico para inicio da obra", obrigatorio: true }
      ]
    }
  },
  [InstrumentFlowType.AQUISICAO_EQUIPAMENTOS]: {
    stages: STAGE_ORDER,
    defaultStageItems: {
      [InstrumentWorkflowStage.PROPOSTA]: PROPOSTA_DEFAULT_ITEMS,
      [InstrumentWorkflowStage.REQUISITOS_CELEBRACAO]: [{ nome: "Documentacao", obrigatorio: true }],
      [InstrumentWorkflowStage.PROJETO_BASICO_TERMO_REFERENCIA]: [
        { nome: "Termo de referencia", obrigatorio: true },
        { nome: "Especificacoes tecnicas", obrigatorio: true },
        { nome: "Planilha orcamentaria", obrigatorio: true }
      ],
      [InstrumentWorkflowStage.PROCESSO_EXECUCAO_LICITACAO]: [
        { nome: "Documentacao referente ao processo licitatorio", obrigatorio: true }
      ],
      [InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO]: [
        { nome: "Documentacao para verificacao do processo licitatorio (VRPL)", obrigatorio: true }
      ],
      [InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS]: [{ nome: "Documento", obrigatorio: true }],
      [InstrumentWorkflowStage.ACOMPANHAMENTO_OBRA]: [
        { nome: "Comprovacao de entrega", obrigatorio: true },
        { nome: "Termo de recebimento", obrigatorio: true }
      ]
    }
  },
  [InstrumentFlowType.EVENTOS]: {
    stages: STAGE_ORDER,
    defaultStageItems: {
      [InstrumentWorkflowStage.PROPOSTA]: PROPOSTA_DEFAULT_ITEMS,
      [InstrumentWorkflowStage.REQUISITOS_CELEBRACAO]: [{ nome: "Documentacao", obrigatorio: true }],
      [InstrumentWorkflowStage.PROJETO_BASICO_TERMO_REFERENCIA]: [
        { nome: "Plano de trabalho do evento", obrigatorio: true },
        { nome: "Cronograma", obrigatorio: true },
        { nome: "Orcamento", obrigatorio: true }
      ],
      [InstrumentWorkflowStage.PROCESSO_EXECUCAO_LICITACAO]: [
        { nome: "Documentacao referente ao processo licitatorio", obrigatorio: true }
      ],
      [InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO]: [
        { nome: "Documentacao para verificacao do processo licitatorio (VRPL)", obrigatorio: true }
      ],
      [InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS]: [{ nome: "Documento", obrigatorio: true }],
      [InstrumentWorkflowStage.ACOMPANHAMENTO_OBRA]: [
        { nome: "Relatorio de execucao do evento", obrigatorio: true },
        { nome: "Comprovacao de publico/resultado", obrigatorio: true }
      ]
    }
  }
};

const getFlowDefinition = (flowType: InstrumentFlowType): FlowDefinition => {
  return FLOW_DEFINITIONS[flowType] ?? FLOW_DEFINITIONS[InstrumentFlowType.OBRA];
};

const LEGACY_RENAME_RULES: Array<{
  etapa: InstrumentWorkflowStage;
  from: string;
  to: string;
}> = [
  {
    etapa: InstrumentWorkflowStage.REQUISITOS_CELEBRACAO,
    from: "Documentacao de celebracao",
    to: "Documentacao"
  },
  {
    etapa: InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO,
    from: "Documentacao",
    to: "Documentacao para verificacao do processo licitatorio (VRPL)"
  },
  {
    etapa: InstrumentWorkflowStage.INSTRUMENTOS_CONTRATUAIS,
    from: "Documento contratual",
    to: "Documento"
  }
];

const LEGACY_ITEMS_TO_MAKE_OPTIONAL: Array<{
  etapa: InstrumentWorkflowStage;
  nome: string;
}> = [
  { etapa: InstrumentWorkflowStage.REQUISITOS_CELEBRACAO, nome: "Plano de trabalho aprovado" },
  { etapa: InstrumentWorkflowStage.REQUISITOS_CELEBRACAO, nome: "Certidoes obrigatorias" },
  { etapa: InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO, nome: "Em elaboracao" },
  { etapa: InstrumentWorkflowStage.VERIFICACAO_PROCESSO_LICITATORIO, nome: "Aceite do VRPL" }
];

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const isCompletedStatus = (status: ChecklistItemStatus) => {
  return status === ChecklistItemStatus.CONCLUIDO || status === ChecklistItemStatus.ACEITO;
};

const isItemCompleted = (item: { status: ChecklistItemStatus; concluido: boolean }) => {
  return isCompletedStatus(item.status) || item.concluido;
};

const getPreviousStages = (stage: InstrumentWorkflowStage, stageOrder: InstrumentWorkflowStage[]) => {
  const index = stageOrder.indexOf(stage);
  if (index <= 0) {
    return [] as InstrumentWorkflowStage[];
  }
  return stageOrder.slice(0, index);
};

const createDefaultWorkflowChecklistTx = async (
  tx: Prisma.TransactionClient,
  instrumentId: number,
  flowType: InstrumentFlowType
) => {
  const total = await tx.instrumentChecklistItem.count({ where: { instrumentId } });
  if (total > 0) {
    return;
  }

  const flowDefinition = getFlowDefinition(flowType);

  let ordem = 0;
  const data = flowDefinition.stages.flatMap((etapa) => {
    return flowDefinition.defaultStageItems[etapa].map((item) => {
      const currentOrder = ordem;
      ordem += 1;
      return {
        instrumentId,
        etapa,
        status: ChecklistItemStatus.NAO_INICIADO,
        nomeDocumento: item.nome,
        obrigatorio: item.obrigatorio,
        concluido: false,
        ordem: currentOrder
      };
    });
  });

  if (data.length > 0) {
    await tx.instrumentChecklistItem.createMany({ data });
  }
};

const syncWorkflowChecklistTx = async (tx: Prisma.TransactionClient, instrumentId: number) => {
  const instrument = await tx.instrumentProposal.findUnique({
    where: { id: instrumentId },
    select: { fluxoTipo: true }
  });

  if (!instrument) {
    return;
  }

  const flowType = instrument.fluxoTipo;
  const flowDefinition = getFlowDefinition(flowType);

  await createDefaultWorkflowChecklistTx(tx, instrumentId, flowType);

  const existing = await tx.instrumentChecklistItem.findMany({
    where: { instrumentId },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }]
  });

  if (existing.length === 0) {
    return;
  }

  if (flowType === InstrumentFlowType.OBRA) {
    for (const rule of LEGACY_RENAME_RULES) {
      const sourceItems = existing.filter(
        (item) => item.etapa === rule.etapa && normalizeName(item.nomeDocumento) === normalizeName(rule.from)
      );

      for (const source of sourceItems) {
        const targetExists = existing.some(
          (item) =>
            item.id !== source.id &&
            item.etapa === rule.etapa &&
            normalizeName(item.nomeDocumento) === normalizeName(rule.to)
        );

        if (targetExists) {
          if (source.obrigatorio) {
            await tx.instrumentChecklistItem.update({
              where: { id: source.id },
              data: { obrigatorio: false }
            });
          }
          continue;
        }

        await tx.instrumentChecklistItem.update({
          where: { id: source.id },
          data: {
            nomeDocumento: rule.to
          }
        });
      }
    }

    for (const legacyItem of LEGACY_ITEMS_TO_MAKE_OPTIONAL) {
      const toUpdate = existing.filter(
        (item) =>
          item.etapa === legacyItem.etapa &&
          normalizeName(item.nomeDocumento) === normalizeName(legacyItem.nome) &&
          item.obrigatorio
      );

      for (const item of toUpdate) {
        await tx.instrumentChecklistItem.update({
          where: { id: item.id },
          data: { obrigatorio: false }
        });
      }
    }
  }

  const refreshed = await tx.instrumentChecklistItem.findMany({
    where: { instrumentId },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }]
  });

  for (const etapa of flowDefinition.stages) {
    const stageItems = refreshed.filter((item) => item.etapa === etapa);
    let stageOrder = stageItems.reduce((max, item) => Math.max(max, item.ordem), -1);

    for (const defaultItem of flowDefinition.defaultStageItems[etapa]) {
      const existingDefault = stageItems.find(
        (item) => normalizeName(item.nomeDocumento) === normalizeName(defaultItem.nome)
      );

      if (existingDefault) {
        if (defaultItem.obrigatorio && !existingDefault.obrigatorio) {
          await tx.instrumentChecklistItem.update({
            where: { id: existingDefault.id },
            data: { obrigatorio: true }
          });
        }
        continue;
      }

      stageOrder += 1;
      await tx.instrumentChecklistItem.create({
        data: {
          instrumentId,
          etapa,
          status: ChecklistItemStatus.NAO_INICIADO,
          nomeDocumento: defaultItem.nome,
          obrigatorio: defaultItem.obrigatorio,
          concluido: false,
          ordem: stageOrder
        }
      });
    }
  }
};

const ensureWorkflowChecklist = async (instrumentId: number) => {
  await prisma.$transaction(async (tx) => {
    await syncWorkflowChecklistTx(tx, instrumentId);
  });
};

export const syncAllExistingWorkflowChecklists = async () => {
  const instruments = await prisma.instrumentProposal.findMany({
    select: { id: true }
  });

  for (const instrument of instruments) {
    await prisma.$transaction(async (tx) => {
      await syncWorkflowChecklistTx(tx, instrument.id);
    });
  }

  return {
    instrumentos_processados: instruments.length
  };
};

const areStagesCompleted = (
  items: Array<{ etapa: InstrumentWorkflowStage; obrigatorio: boolean; status: ChecklistItemStatus; concluido: boolean }>,
  stages: InstrumentWorkflowStage[]
) => {
  return stages.every((stage) => {
    const mandatoryItems = items.filter((item) => item.etapa === stage && item.obrigatorio);
    if (mandatoryItems.length === 0) {
      return false;
    }
    return mandatoryItems.every(isItemCompleted);
  });
};

export const createInstrument = async (input: CreateInstrumentInput) => {
  return prisma.$transaction(async (tx) => {
    const created = await tx.instrumentProposal.create({
      data: {
        proposta: input.proposta,
        instrumento: input.instrumento,
        objeto: input.objeto,
        valorRepasse: input.valor_repasse,
        valorContrapartida: input.valor_contrapartida,
        dataCadastro: new Date(`${input.data_cadastro}T00:00:00.000Z`),
        dataAssinatura: toDate(input.data_assinatura),
        vigenciaInicio: new Date(`${input.vigencia_inicio}T00:00:00.000Z`),
        vigenciaFim: new Date(`${input.vigencia_fim}T00:00:00.000Z`),
        dataPrestacaoContas: toDate(input.data_prestacao_contas),
        dataDou: toDate(input.data_dou),
        concedente: input.concedente,
        convenete: input.convenete_id ? { connect: { id: input.convenete_id } } : undefined,
        fluxoTipo: input.fluxo_tipo,
        status: input.status,
        responsavel: input.responsavel,
        orgaoExecutor: input.orgao_executor,
        observacoes: input.observacoes
      }
    });

    await createDefaultWorkflowChecklistTx(tx, created.id, created.fluxoTipo);
    await tx.instrumentWorkProgress.upsert({
      where: { instrumentId: created.id },
      update: {},
      create: { instrumentId: created.id, percentualObra: 0 }
    });

    return created;
  });
};

export const listInstruments = async (query: ListQueryInput) => {
  const where: Prisma.InstrumentProposalWhereInput = {
    ativo: query.ativo
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.concedente) {
    where.concedente = {
      contains: query.concedente
    };
  }

  if (query.vigencia_de || query.vigencia_ate) {
    where.vigenciaFim = {
      gte: toDate(query.vigencia_de),
      lte: toDate(query.vigencia_ate)
    };
  }

  return prisma.instrumentProposal.findMany({
    where,
    include: instrumentRepasseInclude,
    orderBy: [{ vigenciaFim: "asc" }, { createdAt: "desc" }]
  });
};

export const getInstrumentById = async (id: number) => {
  return prisma.instrumentProposal.findUnique({ where: { id }, include: instrumentRepasseInclude });
};

export const updateInstrument = async (id: number, input: UpdateInstrumentInput) => {
  const data: Prisma.InstrumentProposalUpdateInput = {
    proposta: input.proposta,
    instrumento: input.instrumento,
    objeto: input.objeto,
    valorRepasse: input.valor_repasse,
    valorContrapartida: input.valor_contrapartida,
    dataCadastro: toDate(input.data_cadastro),
    dataAssinatura: toDate(input.data_assinatura),
    vigenciaInicio: toDate(input.vigencia_inicio),
    vigenciaFim: toDate(input.vigencia_fim),
    dataPrestacaoContas: toDate(input.data_prestacao_contas),
    dataDou: toDate(input.data_dou),
    concedente: input.concedente,
    convenete: input.convenete_id === undefined ? undefined : { connect: { id: input.convenete_id } },
    fluxoTipo: input.fluxo_tipo,
    status: input.status,
    responsavel: input.responsavel,
    orgaoExecutor: input.orgao_executor,
    observacoes: input.observacoes,
    ativo: input.ativo
  };

  return prisma.instrumentProposal.update({
    where: { id },
    data,
    include: instrumentRepasseInclude
  });
};

export const deactivateInstrument = async (id: number) => {
  return prisma.instrumentProposal.update({
    where: { id },
    data: { ativo: false },
    include: instrumentRepasseInclude
  });
};

export const listRepasses = async (instrumentId: number) => {
  return prisma.instrumentRepasse.findMany({
    where: { instrumentId },
    orderBy: [{ dataRepasse: "desc" }, { id: "desc" }]
  });
};

export const createRepasse = async (instrumentId: number, input: RepasseCreateInput) => {
  return prisma.$transaction(async (tx) => {
    const created = await tx.instrumentRepasse.create({
      data: {
        instrumentId,
        dataRepasse: new Date(`${input.data_repasse}T00:00:00.000Z`),
        valorRepasse: input.valor_repasse
      }
    });

    await recalculateInstrumentRepassado(tx, instrumentId);
    return created;
  });
};

export const deleteRepasse = async (instrumentId: number, repasseId: number) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.instrumentRepasse.findFirst({
      where: { id: repasseId, instrumentId }
    });

    if (!existing) {
      return null;
    }

    await tx.instrumentRepasse.delete({ where: { id: repasseId } });
    await recalculateInstrumentRepassado(tx, instrumentId);
    return existing;
  });
};

export const getDeadlineAlerts = async (limiteDias: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const items = await prisma.instrumentProposal.findMany({
    where: { ativo: true },
    orderBy: { vigenciaFim: "asc" }
  });

  const alerts = items
    .map((item) => {
      const vigencia = Math.floor((item.vigenciaFim.getTime() - today.getTime()) / 86400000);
      const prestacao = item.dataPrestacaoContas
        ? Math.floor((item.dataPrestacaoContas.getTime() - today.getTime()) / 86400000)
        : null;

      const inVigenciaLimit = vigencia <= limiteDias;
      const inPrestacaoLimit = prestacao !== null && prestacao <= limiteDias;

      if (!inVigenciaLimit && !inPrestacaoLimit) {
        return null;
      }

      return {
        instrumento_id: item.id,
        proposta: item.proposta,
        instrumento: item.instrumento,
        concedente: item.concedente,
        dias_para_vigencia_fim: vigencia,
        dias_para_prestacao_contas: prestacao
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
    .sort((a, b) => {
      const aMin = Math.min(a.dias_para_vigencia_fim, a.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
      const bMin = Math.min(b.dias_para_vigencia_fim, b.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY);
      return aMin - bMin;
    });

  return {
    referencia: today.toISOString().slice(0, 10),
    limite_dias: limiteDias,
    itens: alerts
  };
};

export const listChecklistItems = async (instrumentId: number) => {
  await ensureWorkflowChecklist(instrumentId);
  return prisma.instrumentChecklistItem.findMany({
    where: { instrumentId },
    include: checklistExternalLinkInclude,
    orderBy: [{ etapa: "asc" }, { ordem: "asc" }, { createdAt: "asc" }]
  });
};

const recalculateInstrumentRepassado = async (tx: Prisma.TransactionClient, instrumentId: number) => {
  const aggregate = await tx.instrumentRepasse.aggregate({
    where: { instrumentId },
    _sum: { valorRepasse: true }
  });

  const total = Number(aggregate._sum.valorRepasse ?? 0);
  await tx.instrumentProposal.update({
    where: { id: instrumentId },
    data: { valorJaRepassado: total }
  });

  return total;
};

export const createChecklistItem = async (instrumentId: number, input: ChecklistItemCreateInput) => {
  await ensureWorkflowChecklist(instrumentId);

  const highestOrder = await prisma.instrumentChecklistItem.findFirst({
    where: { instrumentId, etapa: input.etapa },
    orderBy: { ordem: "desc" }
  });

  const ordem = input.ordem ?? (highestOrder?.ordem ?? -1) + 1;
  const status = input.status ?? ChecklistItemStatus.NAO_INICIADO;

  return prisma.instrumentChecklistItem.create({
    data: {
      instrumentId,
      etapa: input.etapa,
      status,
      nomeDocumento: input.nome_documento,
      obrigatorio: input.obrigatorio ?? true,
      concluido: isCompletedStatus(status),
      observacao: input.observacao,
      ordem
    }
  });
};

export const updateChecklistItem = async (
  instrumentId: number,
  itemId: number,
  input: ChecklistItemUpdateInput
) => {
  await ensureWorkflowChecklist(instrumentId);
  const existing = await getChecklistItemById(instrumentId, itemId);
  if (!existing) {
    throw new Error("CHECKLIST_ITEM_NOT_FOUND");
  }

  const instrument = await prisma.instrumentProposal.findUnique({
    where: { id: instrumentId },
    select: { fluxoTipo: true }
  });
  if (!instrument) {
    throw new Error("CHECKLIST_ITEM_NOT_FOUND");
  }

  const stageOrder = getFlowDefinition(instrument.fluxoTipo).stages;
  const nextStage = input.etapa ?? existing.etapa;
  const nextStatus = input.status ?? existing.status;
  const previousStages = getPreviousStages(nextStage, stageOrder);

  if (nextStatus !== ChecklistItemStatus.NAO_INICIADO && previousStages.length > 0) {
    const allItems = await prisma.instrumentChecklistItem.findMany({ where: { instrumentId } });
    const previousCompleted = areStagesCompleted(allItems, previousStages);
    if (!previousCompleted) {
      throw new Error("CHECKLIST_STAGE_BLOCKED");
    }
  }

  return prisma.instrumentChecklistItem.update({
    where: { id: itemId },
    data: {
      etapa: input.etapa,
      status: input.status,
      nomeDocumento: input.nome_documento,
      obrigatorio: input.obrigatorio,
      observacao: input.observacao,
      ordem: input.ordem,
      concluido: input.status ? isCompletedStatus(input.status) : undefined
    }
  });
};

export const deleteChecklistItem = async (instrumentId: number, itemId: number) => {
  const existing = await getChecklistItemById(instrumentId, itemId);
  if (!existing) {
    throw new Error("CHECKLIST_ITEM_NOT_FOUND");
  }

  return prisma.instrumentChecklistItem.delete({
    where: { id: itemId }
  });
};

export const getChecklistItemById = async (instrumentId: number, itemId: number) => {
  return prisma.instrumentChecklistItem.findFirst({
    where: {
      id: itemId,
      instrumentId
    },
    include: checklistExternalLinkInclude
  });
};

export const createChecklistExternalLink = async (
  instrumentId: number,
  itemId: number,
  payload: {
    token: string;
    validadeDias: number;
    createdByUserId?: number;
    createdByEmail: string;
  }
) => {
  const item = await prisma.instrumentChecklistItem.findFirst({
    where: {
      id: itemId,
      instrumentId
    }
  });
  if (!item) {
    throw new Error("CHECKLIST_ITEM_NOT_FOUND");
  }

  const expiraEm = new Date(Date.now() + payload.validadeDias * 24 * 60 * 60 * 1000);

  await prisma.instrumentChecklistExternalLink.updateMany({
    where: {
      checklistItemId: itemId,
      ativo: true
    },
    data: {
      ativo: false
    }
  });

  return prisma.instrumentChecklistExternalLink.create({
    data: {
      checklistItemId: itemId,
      token: payload.token,
      expiraEm,
      ativo: true,
      createdByUserId: payload.createdByUserId,
      createdByEmail: payload.createdByEmail
    },
    include: {
      files: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
      }
    }
  });
};

export const deactivateChecklistExternalLink = async (instrumentId: number, itemId: number) => {
  const item = await prisma.instrumentChecklistItem.findFirst({
    where: {
      id: itemId,
      instrumentId
    }
  });

  if (!item) {
    throw new Error("CHECKLIST_ITEM_NOT_FOUND");
  }

  const result = await prisma.instrumentChecklistExternalLink.updateMany({
    where: {
      checklistItemId: itemId,
      ativo: true
    },
    data: {
      ativo: false
    }
  });

  return {
    desativados: result.count
  };
};

export const getActiveChecklistExternalLinkByToken = async (token: string) => {
  const link = await prisma.instrumentChecklistExternalLink.findFirst({
    where: {
      token,
      ativo: true
    },
    include: {
      checklistItem: {
        include: {
          instrument: {
            select: {
              id: true,
              proposta: true,
              instrumento: true,
              concedente: true
            }
          }
        }
      },
      files: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }]
      }
    }
  });

  if (!link) {
    return null;
  }

  if (link.expiraEm.getTime() < Date.now()) {
    await prisma.instrumentChecklistExternalLink.update({
      where: { id: link.id },
      data: { ativo: false }
    });
    return null;
  }

  return link;
};

export const getChecklistExternalLinkByToken = async (token: string) => {
  return prisma.instrumentChecklistExternalLink.findFirst({
    where: {
      token
    },
    include: {
      checklistItem: {
        include: {
          instrument: {
            select: {
              proposta: true,
              instrumento: true
            }
          }
        }
      }
    }
  });
};

export const saveChecklistExternalFilesByToken = async (
  token: string,
  payload: {
    nomeRemetente: string;
    files: Array<{
      arquivoPath: string;
      arquivoNomeOriginal: string;
      arquivoMimeType?: string;
      arquivoTamanho?: number;
    }>;
  }
) => {
  const link = await getActiveChecklistExternalLinkByToken(token);
  if (!link) {
    throw new Error("CHECKLIST_EXTERNAL_LINK_NOT_FOUND");
  }

  if (payload.files.length === 0) {
    throw new Error("CHECKLIST_EXTERNAL_FILES_REQUIRED");
  }

  const totalArquivosNoLink = await prisma.$transaction(async (tx) => {
    await tx.instrumentChecklistExternalFile.createMany({
      data: payload.files.map((file) => ({
        externalLinkId: link.id,
        nomeRemetente: payload.nomeRemetente,
        arquivoPath: file.arquivoPath,
        arquivoNomeOriginal: file.arquivoNomeOriginal,
        arquivoMimeType: file.arquivoMimeType,
        arquivoTamanho: file.arquivoTamanho
      }))
    });

    await tx.instrumentChecklistItem.update({
      where: { id: link.checklistItemId },
      data: {
        status: ChecklistItemStatus.CONCLUIDO,
        concluido: true
      }
    });

    await tx.instrumentChecklistExternalLink.update({
      where: { id: link.id },
      data: { ativo: false }
    });

    return tx.instrumentChecklistExternalFile.count({
      where: { externalLinkId: link.id }
    });
  });

  return {
    totalArquivosNoLink
  };
};

export const listChecklistExternalFiles = async (instrumentId: number, itemId: number) => {
  return prisma.instrumentChecklistExternalFile.findMany({
    where: {
      externalLink: {
        checklistItemId: itemId,
        checklistItem: {
          instrumentId
        }
      }
    },
    include: {
      externalLink: {
        select: {
          id: true,
          token: true,
          ativo: true,
          expiraEm: true,
          createdAt: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
};

export const getChecklistExternalFileById = async (instrumentId: number, itemId: number, fileId: number) => {
  return prisma.instrumentChecklistExternalFile.findFirst({
    where: {
      id: fileId,
      externalLink: {
        checklistItemId: itemId,
        checklistItem: {
          instrumentId
        }
      }
    },
    include: {
      externalLink: {
        select: {
          id: true,
          token: true,
          checklistItemId: true
        }
      }
    }
  });
};

export const updateChecklistItemUpload = async (
  instrumentId: number,
  itemId: number,
  payload: {
    arquivoPath: string;
    arquivoNomeOriginal: string;
    arquivoMimeType: string;
    arquivoTamanho: number;
  }
) => {
  const existing = await getChecklistItemById(instrumentId, itemId);
  if (!existing) {
    throw new Error("CHECKLIST_ITEM_NOT_FOUND");
  }

  return prisma.instrumentChecklistItem.update({
    where: { id: itemId },
    data: {
      arquivoPath: payload.arquivoPath,
      arquivoNomeOriginal: payload.arquivoNomeOriginal,
      arquivoMimeType: payload.arquivoMimeType,
      arquivoTamanho: payload.arquivoTamanho,
      uploadedAt: new Date(),
      concluido: true,
      status: ChecklistItemStatus.CONCLUIDO
    }
  });
};

export const clearChecklistItemUpload = async (instrumentId: number, itemId: number) => {
  const existing = await getChecklistItemById(instrumentId, itemId);
  if (!existing) {
    throw new Error("CHECKLIST_ITEM_NOT_FOUND");
  }

  return prisma.instrumentChecklistItem.update({
    where: { id: itemId },
    data: {
      arquivoPath: null,
      arquivoNomeOriginal: null,
      arquivoMimeType: null,
      arquivoTamanho: null,
      uploadedAt: null,
      concluido: false,
      status: ChecklistItemStatus.NAO_INICIADO
    }
  });
};

export const listStageFollowUps = async (instrumentId: number, stage: InstrumentWorkflowStage) => {
  return prisma.instrumentStageFollowUp.findMany({
    where: {
      instrumentId,
      etapa: stage
    },
    include: {
      user: {
        select: {
          id: true,
          nome: true,
          email: true,
          avatarPath: true,
          updatedAt: true
        }
      },
      files: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }]
      }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
};

export const createStageFollowUp = async (
  instrumentId: number,
  stage: InstrumentWorkflowStage,
  payload: {
    texto?: string;
    userId?: number;
    userEmail: string;
    files: Array<{
      arquivoPath: string;
      arquivoNomeOriginal: string;
      arquivoMimeType?: string;
      arquivoTamanho?: number;
    }>;
  }
) => {
  const texto = payload.texto?.trim() ?? "";
  if (texto.length === 0 && payload.files.length === 0) {
    throw new Error("STAGE_FOLLOW_UP_EMPTY");
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.instrumentStageFollowUp.create({
      data: {
        instrumentId,
        etapa: stage,
        texto: texto.length > 0 ? texto : null,
        userId: payload.userId,
        userEmail: payload.userEmail
      }
    });

    if (payload.files.length > 0) {
      await tx.instrumentStageFollowUpFile.createMany({
        data: payload.files.map((file) => ({
          followUpId: created.id,
          arquivoPath: file.arquivoPath,
          arquivoNomeOriginal: file.arquivoNomeOriginal,
          arquivoMimeType: file.arquivoMimeType,
          arquivoTamanho: file.arquivoTamanho
        }))
      });
    }

    return tx.instrumentStageFollowUp.findUnique({
      where: { id: created.id },
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            avatarPath: true,
            updatedAt: true
          }
        },
        files: {
          orderBy: [{ createdAt: "asc" }, { id: "asc" }]
        }
      }
    });
  });
};

export const getStageFollowUpFileById = async (
  instrumentId: number,
  stage: InstrumentWorkflowStage,
  followUpId: number,
  fileId: number
) => {
  return prisma.instrumentStageFollowUpFile.findFirst({
    where: {
      id: fileId,
      followUpId,
      followUp: {
        instrumentId,
        etapa: stage
      }
    },
    include: {
      followUp: {
        select: {
          id: true,
          instrumentId: true,
          etapa: true
        }
      }
    }
  });
};

export const getChecklistSummary = async (instrumentId: number) => {
  await ensureWorkflowChecklist(instrumentId);
  const [items, instrument] = await Promise.all([
    prisma.instrumentChecklistItem.findMany({ where: { instrumentId } }),
    prisma.instrumentProposal.findUnique({ where: { id: instrumentId }, select: { fluxoTipo: true } })
  ]);
  const stageOrder = getFlowDefinition(instrument?.fluxoTipo ?? InstrumentFlowType.OBRA).stages;
  const total = items.length;
  const obrigatorios = items.filter((item) => item.obrigatorio).length;
  const concluidos = items.filter(isItemCompleted).length;
  const obrigatoriosConcluidos = items.filter((item) => item.obrigatorio && isItemCompleted(item)).length;

  const stageSummary = stageOrder.map((etapa) => {
    const stageItems = items.filter((item) => item.etapa === etapa);
    const stageMandatory = stageItems.filter((item) => item.obrigatorio);
    const pending = stageMandatory.filter((item) => !isItemCompleted(item)).map((item) => item.nomeDocumento);

    return {
      etapa,
      total: stageItems.length,
      obrigatorios: stageMandatory.length,
      concluidos: stageItems.filter(isItemCompleted).length,
      obrigatorios_concluidos: stageMandatory.filter(isItemCompleted).length,
      concluida: stageMandatory.length > 0 && pending.length === 0,
      pendentes_obrigatorios: pending
    };
  });

  const etapaAtual = stageSummary.find((item) => !item.concluida)?.etapa ?? null;
  const executionRequiredStages = stageOrder.slice(0, 5);
  const podeIniciarExecucao = areStagesCompleted(items, executionRequiredStages);
  const pendentesObrigatorios = stageSummary
    .filter((stage) => executionRequiredStages.includes(stage.etapa))
    .flatMap((stage) => stage.pendentes_obrigatorios);

  return {
    total,
    obrigatorios,
    concluidos,
    obrigatorios_concluidos: obrigatoriosConcluidos,
    pode_iniciar_execucao: obrigatorios > 0 && podeIniciarExecucao,
    pendentes_obrigatorios: pendentesObrigatorios,
    etapa_atual: etapaAtual,
    etapas: stageSummary
  };
};

export const getWorkProgress = async (instrumentId: number) => {
  const progress = await prisma.instrumentWorkProgress.upsert({
    where: { instrumentId },
    update: {},
    create: {
      instrumentId,
      percentualObra: 0
    }
  });

  const boletins = await prisma.instrumentMeasurementBulletin.findMany({
    where: { instrumentId },
    orderBy: [{ dataBoletim: "desc" }, { id: "desc" }]
  });

  const valorTotalBoletins = boletins.reduce((acc, item) => acc + Number(item.valorMedicao), 0);

  return {
    percentual_obra: Number(progress.percentualObra),
    valor_total_boletins: valorTotalBoletins,
    boletins: boletins.map((item) => ({
      id: item.id,
      data_boletim: item.dataBoletim.toISOString().slice(0, 10),
      valor_medicao: Number(item.valorMedicao),
      percentual_obra_informado: item.percentualObraInformado ? Number(item.percentualObraInformado) : null,
      observacao: item.observacao,
      created_at: item.createdAt.toISOString()
    }))
  };
};

export const updateWorkProgress = async (instrumentId: number, input: WorkProgressUpdateInput) => {
  const updated = await prisma.instrumentWorkProgress.upsert({
    where: { instrumentId },
    update: {
      percentualObra: input.percentual_obra
    },
    create: {
      instrumentId,
      percentualObra: input.percentual_obra
    }
  });

  return {
    percentual_obra: Number(updated.percentualObra)
  };
};

export const createMeasurementBulletin = async (instrumentId: number, input: MeasurementCreateInput) => {
  const created = await prisma.instrumentMeasurementBulletin.create({
    data: {
      instrumentId,
      dataBoletim: new Date(`${input.data_boletim}T00:00:00.000Z`),
      valorMedicao: input.valor_medicao,
      percentualObraInformado: input.percentual_obra_informado,
      observacao: input.observacao
    }
  });

  if (input.percentual_obra_informado !== undefined) {
    await prisma.instrumentWorkProgress.upsert({
      where: { instrumentId },
      update: {
        percentualObra: input.percentual_obra_informado
      },
      create: {
        instrumentId,
        percentualObra: input.percentual_obra_informado
      }
    });
  }

  return {
    id: created.id,
    data_boletim: created.dataBoletim.toISOString().slice(0, 10),
    valor_medicao: Number(created.valorMedicao),
    percentual_obra_informado: created.percentualObraInformado
      ? Number(created.percentualObraInformado)
      : null,
    observacao: created.observacao,
    created_at: created.createdAt.toISOString()
  };
};

export const deleteMeasurementBulletin = async (instrumentId: number, boletimId: number) => {
  const item = await prisma.instrumentMeasurementBulletin.findFirst({
    where: {
      id: boletimId,
      instrumentId
    }
  });

  if (!item) {
    throw new Error("MEASUREMENT_NOT_FOUND");
  }

  await prisma.instrumentMeasurementBulletin.delete({
    where: { id: boletimId }
  });
};
