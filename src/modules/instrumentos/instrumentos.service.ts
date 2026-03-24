import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  ChecklistItemCreateInput,
  ChecklistItemUpdateInput,
  CreateInstrumentInput,
  ListQueryInput,
  UpdateInstrumentInput
} from "./instrumentos.schema";

const toDate = (value?: string): Date | undefined => {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}T00:00:00.000Z`);
};

export const createInstrument = async (input: CreateInstrumentInput) => {
  return prisma.instrumentProposal.create({
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
      status: input.status,
      responsavel: input.responsavel,
      orgaoExecutor: input.orgao_executor,
      observacoes: input.observacoes
    }
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
    orderBy: [{ vigenciaFim: "asc" }, { createdAt: "desc" }]
  });
};

export const getInstrumentById = async (id: number) => {
  return prisma.instrumentProposal.findUnique({ where: { id } });
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
    convenete:
      input.convenete_id === undefined ? undefined : { connect: { id: input.convenete_id } },
    status: input.status,
    responsavel: input.responsavel,
    orgaoExecutor: input.orgao_executor,
    observacoes: input.observacoes,
    ativo: input.ativo
  };

  return prisma.instrumentProposal.update({
    where: { id },
    data
  });
};

export const deactivateInstrument = async (id: number) => {
  return prisma.instrumentProposal.update({
    where: { id },
    data: { ativo: false }
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
      const aMin = Math.min(
        a.dias_para_vigencia_fim,
        a.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY
      );
      const bMin = Math.min(
        b.dias_para_vigencia_fim,
        b.dias_para_prestacao_contas ?? Number.POSITIVE_INFINITY
      );
      return aMin - bMin;
    });

  return {
    referencia: today.toISOString().slice(0, 10),
    limite_dias: limiteDias,
    itens: alerts
  };
};

export const listChecklistItems = async (instrumentId: number) => {
  return prisma.instrumentChecklistItem.findMany({
    where: { instrumentId },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }]
  });
};

export const createChecklistItem = async (instrumentId: number, input: ChecklistItemCreateInput) => {
  const highestOrder = await prisma.instrumentChecklistItem.findFirst({
    where: { instrumentId },
    orderBy: { ordem: "desc" }
  });

  const ordem = input.ordem ?? (highestOrder?.ordem ?? -1) + 1;

  return prisma.instrumentChecklistItem.create({
    data: {
      instrumentId,
      nomeDocumento: input.nome_documento,
      obrigatorio: input.obrigatorio ?? true,
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
  const existing = await getChecklistItemById(instrumentId, itemId);
  if (!existing) {
    throw new Error("CHECKLIST_ITEM_NOT_FOUND");
  }

  return prisma.instrumentChecklistItem.update({
    where: { id: itemId },
    data: {
      nomeDocumento: input.nome_documento,
      obrigatorio: input.obrigatorio,
      observacao: input.observacao,
      ordem: input.ordem
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
      concluido: true
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
      concluido: false
    }
  });
};

export const getChecklistSummary = async (instrumentId: number) => {
  const items = await prisma.instrumentChecklistItem.findMany({ where: { instrumentId } });
  const total = items.length;
  const obrigatorios = items.filter((item) => item.obrigatorio).length;
  const concluidos = items.filter((item) => item.concluido).length;
  const obrigatoriosConcluidos = items.filter((item) => item.obrigatorio && item.concluido).length;
  const pendentesObrigatorios = items
    .filter((item) => item.obrigatorio && !item.concluido)
    .map((item) => item.nomeDocumento);

  return {
    total,
    obrigatorios,
    concluidos,
    obrigatorios_concluidos: obrigatoriosConcluidos,
    pode_iniciar_execucao: obrigatorios > 0 && obrigatorios === obrigatoriosConcluidos,
    pendentes_obrigatorios: pendentesObrigatorios
  };
};
