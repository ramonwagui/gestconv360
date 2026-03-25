import { InstrumentFlowType, InstrumentStatus, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { ObraReportQueryInput, RepasseReportQueryInput } from "./relatorios.schema";

const toDate = (value?: string, endOfDay = false) => {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}${endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"}`);
};

const toMonthKey = (value: Date) => value.toISOString().slice(0, 7);

type InstrumentWithReportData = {
  id: number;
  proposta: string;
  instrumento: string;
  status: InstrumentStatus;
  valorRepasse: { toString(): string } | number;
  valorJaRepassado: { toString(): string } | number;
  dataPrestacaoContas: Date | null;
  concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  orgaoExecutor: string | null;
  repasses: Array<{
    id: number;
    dataRepasse: Date;
    valorRepasse: { toString(): string } | number;
  }>;
  workProgress: {
    percentualObra: { toString(): string } | number;
  } | null;
};

export const buildRepasseReport = async (query: RepasseReportQueryInput) => {
  const convenete = await prisma.convenete.findUnique({
    where: { id: query.convenete_id },
    select: {
      id: true,
      nome: true,
      cnpj: true
    }
  });

  if (!convenete) {
    return null;
  }

  const repasseWhere = {
    gte: toDate(query.data_de),
    lte: toDate(query.data_ate, true)
  };

  const instruments = (await prisma.instrumentProposal.findMany({
    where: {
      conveneteId: query.convenete_id,
      id: query.instrumento_id
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      status: true,
      valorRepasse: true,
      valorJaRepassado: true,
      dataPrestacaoContas: true,
      concedente: true,
      banco: true,
      agencia: true,
      conta: true,
      orgaoExecutor: true,
      repasses: {
        where: {
          dataRepasse: repasseWhere
        },
        orderBy: [{ dataRepasse: "asc" }, { id: "asc" }],
        select: {
          id: true,
          dataRepasse: true,
          valorRepasse: true
        }
      },
      workProgress: {
        select: {
          percentualObra: true
        }
      }
    },
    orderBy: [{ instrumento: "asc" }, { id: "asc" }]
  })) as InstrumentWithReportData[];

  const instrumentLookup = new Map(instruments.map((item) => [item.id, item]));

  const repasses = instruments
    .flatMap((item) =>
      item.repasses.map((repasse) => ({
        id: repasse.id,
        instrumento_id: item.id,
        proposta: item.proposta,
        instrumento: item.instrumento,
        data_repasse: repasse.dataRepasse.toISOString().slice(0, 10),
        valor_repasse: Number(repasse.valorRepasse)
      }))
    )
    .sort((a, b) => {
      if (a.data_repasse === b.data_repasse) {
        return a.id - b.id;
      }
      return a.data_repasse.localeCompare(b.data_repasse);
    });

  const repassesByMonth = new Map<string, number>();
  repasses.forEach((item) => {
    const key = toMonthKey(new Date(`${item.data_repasse}T00:00:00.000Z`));
    repassesByMonth.set(key, (repassesByMonth.get(key) ?? 0) + item.valor_repasse);
  });

  const repassesByInstrument = new Map<number, number>();
  repasses.forEach((item) => {
    repassesByInstrument.set(item.instrumento_id, (repassesByInstrument.get(item.instrumento_id) ?? 0) + item.valor_repasse);
  });

  const valorPactuado = instruments.reduce((acc, item) => acc + Number(item.valorRepasse), 0);
  const valorRepassadoHistorico = instruments.reduce((acc, item) => acc + Number(item.valorJaRepassado), 0);
  const valorRepassadoPeriodo = repasses.reduce((acc, item) => acc + item.valor_repasse, 0);
  const quantidadeRepasses = repasses.length;
  const ticketMedio = quantidadeRepasses > 0 ? valorRepassadoPeriodo / quantidadeRepasses : 0;
  const saldoPactuado = Math.max(0, valorPactuado - valorRepassadoHistorico);
  const percentualRepassado = valorPactuado > 0 ? Math.min(100, (valorRepassadoHistorico / valorPactuado) * 100) : 0;

  const porStatusMap = new Map<InstrumentStatus, number>();
  instruments.forEach((item) => {
    porStatusMap.set(item.status, (porStatusMap.get(item.status) ?? 0) + 1);
  });

  return {
    filtros: {
      convenete_id: convenete.id,
      convenete_nome: convenete.nome,
      convenete_cnpj: convenete.cnpj,
      instrumento_id: query.instrumento_id ?? null,
      data_de: query.data_de ?? null,
      data_ate: query.data_ate ?? null
    },
    kpis: {
      instrumentos: instruments.length,
      quantidade_repasses: quantidadeRepasses,
      valor_repassado_periodo: valorRepassadoPeriodo,
      ticket_medio_repasse: ticketMedio,
      valor_pactuado: valorPactuado,
      valor_ja_repassado: valorRepassadoHistorico,
      saldo_pactuado: saldoPactuado,
      percentual_repassado: percentualRepassado
    },
    series: {
      repasses_mensais: Array.from(repassesByMonth.entries()).map(([mes, valor]) => ({ mes, valor })),
      repasses_por_instrumento: instruments.map((item) => ({
        instrumento_id: item.id,
        instrumento: item.instrumento,
        proposta: item.proposta,
        valor: repassesByInstrument.get(item.id) ?? 0
      })),
      instrumentos_por_status: Array.from(porStatusMap.entries()).map(([status, quantidade]) => ({
        status,
        quantidade
      }))
    },
    instrumentos: instruments.map((item) => ({
      id: item.id,
      proposta: item.proposta,
      instrumento: item.instrumento,
      status: item.status,
      data_prestacao_contas: item.dataPrestacaoContas ? item.dataPrestacaoContas.toISOString().slice(0, 10) : null,
      orgao_concedente: item.concedente,
      banco: item.banco,
      agencia: item.agencia,
      conta: item.conta,
      empresa_vencedora: item.orgaoExecutor,
      valor_pactuado: Number(item.valorRepasse),
      valor_ja_repassado: Number(item.valorJaRepassado),
      valor_repassado_periodo: repassesByInstrument.get(item.id) ?? 0,
      saldo_pactuado: Math.max(0, Number(item.valorRepasse) - Number(item.valorJaRepassado)),
      percentual_obra: item.workProgress ? Number(item.workProgress.percentualObra) : null
    })),
    repasses: repasses.map((item) => ({
      ...item,
      empresa_vencedora: instrumentLookup.get(item.instrumento_id)?.orgaoExecutor ?? null
    }))
  };
};

type ObraInstrumentRow = {
  id: number;
  proposta: string;
  instrumento: string;
  objeto: string;
  status: InstrumentStatus;
  concedente: string;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  dataPrestacaoContas: Date | null;
  vigenciaFim: Date;
  valorRepasse: { toString(): string } | number;
  valorJaRepassado: { toString(): string } | number;
  convenete: { id: number; nome: string } | null;
  workProgress: { percentualObra: { toString(): string } | number } | null;
  measurementBulletins: Array<{
    dataBoletim: Date;
    valorMedicao: { toString(): string } | number;
    percentualObraInformado: { toString(): string } | number | null;
  }>;
  repasses: Array<{
    dataRepasse: Date;
    valorRepasse: { toString(): string } | number;
  }>;
};

const monthKey = (value: Date) => value.toISOString().slice(0, 7);

export const buildObraReport = async (query: ObraReportQueryInput) => {
  const boletimDateWhere = {
    gte: toDate(query.data_de),
    lte: toDate(query.data_ate, true)
  };

  const where: Prisma.InstrumentProposalWhereInput = {
    fluxoTipo: InstrumentFlowType.OBRA,
    ativo: query.ativo
  };

  if (query.convenete_id !== undefined) {
    where.conveneteId = query.convenete_id;
  }
  if (query.instrumento_id !== undefined) {
    where.id = query.instrumento_id;
  }
  if (query.status) {
    where.status = query.status;
  }

  const items = (await prisma.instrumentProposal.findMany({
    where,
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      objeto: true,
      status: true,
      concedente: true,
      banco: true,
      agencia: true,
      conta: true,
      dataPrestacaoContas: true,
      vigenciaFim: true,
      valorRepasse: true,
      valorJaRepassado: true,
      convenete: {
        select: {
          id: true,
          nome: true
        }
      },
      workProgress: {
        select: {
          percentualObra: true
        }
      },
      measurementBulletins: {
        where: {
          dataBoletim: boletimDateWhere
        },
        orderBy: [{ dataBoletim: "desc" }, { id: "desc" }],
        select: {
          dataBoletim: true,
          valorMedicao: true,
          percentualObraInformado: true
        }
      },
      repasses: {
        where: {
          dataRepasse: {
            gte: toDate(query.data_de),
            lte: toDate(query.data_ate, true)
          }
        },
        select: {
          dataRepasse: true,
          valorRepasse: true
        }
      }
    },
    orderBy: [{ vigenciaFim: "asc" }, { instrumento: "asc" }]
  })) as ObraInstrumentRow[];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const boletinsMensais = new Map<string, number>();
  const repassesMensais = new Map<string, number>();
  const statusMap = new Map<InstrumentStatus, number>();

  const instrumentos = items.map((item) => {
    const percentualObra = item.workProgress ? Number(item.workProgress.percentualObra) : 0;
    const valorBoletins = item.measurementBulletins.reduce((acc, b) => acc + Number(b.valorMedicao), 0);
    const valorRepassesPeriodo = item.repasses.reduce((acc, r) => acc + Number(r.valorRepasse), 0);

    item.measurementBulletins.forEach((boletim) => {
      const key = monthKey(boletim.dataBoletim);
      boletinsMensais.set(key, (boletinsMensais.get(key) ?? 0) + Number(boletim.valorMedicao));
    });
    item.repasses.forEach((repasse) => {
      const key = monthKey(repasse.dataRepasse);
      repassesMensais.set(key, (repassesMensais.get(key) ?? 0) + Number(repasse.valorRepasse));
    });

    statusMap.set(item.status, (statusMap.get(item.status) ?? 0) + 1);

    const diasParaVigenciaFim = Math.floor((item.vigenciaFim.getTime() - today.getTime()) / 86400000);
    const ultimoBoletim = item.measurementBulletins[0] ?? null;

    let risco: "BAIXO" | "MEDIO" | "ALTO" = "BAIXO";
    if ((diasParaVigenciaFim <= 60 && percentualObra < 70) || (ultimoBoletim === null && percentualObra < 50)) {
      risco = "ALTO";
    } else if (diasParaVigenciaFim <= 120 && percentualObra < 70) {
      risco = "MEDIO";
    }

    return {
      id: item.id,
      proposta: item.proposta,
      instrumento: item.instrumento,
      objeto: item.objeto,
      status: item.status,
      convenete_id: item.convenete?.id ?? null,
      convenete_nome: item.convenete?.nome ?? null,
      orgao_concedente: item.concedente,
      banco: item.banco,
      agencia: item.agencia,
      conta: item.conta,
      data_prestacao_contas: item.dataPrestacaoContas ? item.dataPrestacaoContas.toISOString().slice(0, 10) : null,
      vigencia_fim: item.vigenciaFim.toISOString().slice(0, 10),
      dias_para_vigencia_fim: diasParaVigenciaFim,
      percentual_obra: percentualObra,
      valor_pactuado: Number(item.valorRepasse),
      valor_ja_repassado: Number(item.valorJaRepassado),
      valor_boletins_periodo: valorBoletins,
      valor_repasses_periodo: valorRepassesPeriodo,
      ultimo_boletim_data: ultimoBoletim ? ultimoBoletim.dataBoletim.toISOString().slice(0, 10) : null,
      ultimo_boletim_valor: ultimoBoletim ? Number(ultimoBoletim.valorMedicao) : null,
      risco
    };
  });

  const kpis = {
    obras_monitoradas: instrumentos.length,
    percentual_medio_obra:
      instrumentos.length > 0
        ? instrumentos.reduce((acc, item) => acc + item.percentual_obra, 0) / instrumentos.length
        : 0,
    valor_total_boletins_periodo: instrumentos.reduce((acc, item) => acc + item.valor_boletins_periodo, 0),
    valor_total_repasses_periodo: instrumentos.reduce((acc, item) => acc + item.valor_repasses_periodo, 0),
    obras_risco_alto: instrumentos.filter((item) => item.risco === "ALTO").length
  };

  return {
    filtros: {
      convenete_id: query.convenete_id ?? null,
      instrumento_id: query.instrumento_id ?? null,
      status: query.status ?? null,
      ativo: query.ativo,
      data_de: query.data_de ?? null,
      data_ate: query.data_ate ?? null
    },
    kpis,
    series: {
      boletins_mensais: Array.from(boletinsMensais.entries()).map(([mes, valor]) => ({ mes, valor })),
      repasses_mensais: Array.from(repassesMensais.entries()).map(([mes, valor]) => ({ mes, valor })),
      obras_por_status: Array.from(statusMap.entries()).map(([status, quantidade]) => ({ status, quantidade }))
    },
    instrumentos
  };
};
