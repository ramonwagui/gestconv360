import { InstrumentFlowType, InstrumentStatus, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { ensureInstrumentSupportData } from "../instrumentos/instrumentos.service";

import {
  CreateConveneteFromProponenteInput,
  CreateConveneteInput,
  ProponenteSugestaoQueryInput,
  UpdateConveneteInput
} from "./convenetes.schema";

const TABLE_TRANSFERENCIAS_DISCRICIONARIAS = "transferencias_discricionarias";

const escapeLikeValue = (value: string) => value.replace(/([\\%_])/g, "\\$1");

const isMissingTransferenciasTableError = (error: unknown) => {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2010") {
    return false;
  }

  const metaMessage =
    typeof error.meta === "object" && error.meta && "message" in error.meta
      ? String((error.meta as { message?: unknown }).message ?? "")
      : "";

  const details = `${error.message} ${metaMessage}`.toLowerCase();
  return details.includes("no such table") && details.includes(TABLE_TRANSFERENCIAS_DISCRICIONARIAS);
};

const parseMaybeDate = (value: string | null | undefined): Date | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (brMatch) {
    return new Date(`${brMatch[3]}-${brMatch[2]}-${brMatch[1]}T00:00:00.000Z`);
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return new Date(`${trimmed}T00:00:00.000Z`);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNonNegativeNumber = (value: number | string | null | undefined) => {
  const num = typeof value === "number" ? value : Number(value ?? 0);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, num);
};

const normalizeCode = (value: string | null | undefined) => value?.trim() ?? "";

const mapStatusFromTransferencia = (
  situacaoProposta: string | null,
  situacaoConvenio: string | null,
  vigenciaFim: Date
): InstrumentStatus => {
  const source = `${situacaoConvenio ?? ""} ${situacaoProposta ?? ""}`.toLowerCase();

  if (source.includes("conclu") || source.includes("encerr")) {
    return InstrumentStatus.CONCLUIDO;
  }
  if (source.includes("prest") && source.includes("cont")) {
    return InstrumentStatus.PRESTACAO_PENDENTE;
  }
  if (source.includes("exec") || source.includes("vigent")) {
    return InstrumentStatus.EM_EXECUCAO;
  }
  if (vigenciaFim.getTime() < Date.now()) {
    return InstrumentStatus.VENCIDO;
  }
  if (source.includes("assin")) {
    return InstrumentStatus.ASSINADO;
  }

  return InstrumentStatus.EM_ELABORACAO;
};

type TransferenciaInstrumentoRow = {
  nr_proposta: string | null;
  nr_convenio: string | null;
  objeto: string | null;
  situacao_proposta: string | null;
  situacao_convenio: string | null;
  dia_assin_conv: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  dt_aprovacao_proposta: string | null;
  dt_conclusao_prestacao_contas: string | null;
  valor_global_conv: number | string | null;
  valor_contrapartida_financeira: number | string | null;
};

const importarInstrumentosDoProponente = async (conveneteId: number, cnpjDigits: string) => {
  try {
    const rows = await prisma.$queryRaw<TransferenciaInstrumentoRow[]>(Prisma.sql`
      SELECT
        nr_proposta,
        nr_convenio,
        MAX(objeto) AS objeto,
        MAX(situacao_proposta) AS situacao_proposta,
        MAX(situacao_convenio) AS situacao_convenio,
        MAX(dia_assin_conv) AS dia_assin_conv,
        MAX(dia_inic_vigencia) AS dia_inic_vigencia,
        MAX(dia_fim_vigencia) AS dia_fim_vigencia,
        MAX(dt_aprovacao_proposta) AS dt_aprovacao_proposta,
        MAX(dt_conclusao_prestacao_contas) AS dt_conclusao_prestacao_contas,
        MAX(valor_global_conv) AS valor_global_conv,
        MAX(valor_contrapartida_financeira) AS valor_contrapartida_financeira
      FROM ${Prisma.raw(TABLE_TRANSFERENCIAS_DISCRICIONARIAS)}
      WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ${cnpjDigits}
        AND nr_proposta IS NOT NULL
        AND TRIM(nr_proposta) <> ''
        AND nr_convenio IS NOT NULL
        AND TRIM(nr_convenio) <> ''
      GROUP BY nr_proposta, nr_convenio
      ORDER BY nr_proposta DESC, nr_convenio DESC
    `);

    let criados = 0;
    let atualizados = 0;
    let ignorados = 0;
    let erros = 0;

    for (const row of rows) {
      const proposta = normalizeCode(row.nr_proposta);
      const instrumento = normalizeCode(row.nr_convenio);

      if (proposta === "" || instrumento === "") {
        ignorados += 1;
        continue;
      }

      const vigenciaInicio = parseMaybeDate(row.dia_inic_vigencia) ?? parseMaybeDate(row.dia_assin_conv) ?? new Date();
      const vigenciaFim = parseMaybeDate(row.dia_fim_vigencia) ?? vigenciaInicio;
      const vigenciaFimSafe = vigenciaFim < vigenciaInicio ? vigenciaInicio : vigenciaFim;
      const dataCadastro = parseMaybeDate(row.dt_aprovacao_proposta) ?? parseMaybeDate(row.dia_assin_conv) ?? vigenciaInicio;
      const dataPrestacaoContas = parseMaybeDate(row.dt_conclusao_prestacao_contas);

      const dataPayload: Prisma.InstrumentProposalUncheckedCreateInput = {
        proposta,
        instrumento,
        objeto: (row.objeto?.trim() || `Instrumento importado automaticamente (${instrumento})`).slice(0, 500),
        valorRepasse: toNonNegativeNumber(row.valor_global_conv),
        valorContrapartida: toNonNegativeNumber(row.valor_contrapartida_financeira),
        dataCadastro,
        dataAssinatura: parseMaybeDate(row.dia_assin_conv),
        vigenciaInicio,
        vigenciaFim: vigenciaFimSafe,
        dataPrestacaoContas,
        dataDou: null,
        concedente: "Transferegov",
        banco: null,
        agencia: null,
        conta: null,
        conveneteId,
        fluxoTipo: InstrumentFlowType.OBRA,
        status: mapStatusFromTransferencia(row.situacao_proposta, row.situacao_convenio, vigenciaFimSafe),
        responsavel: null,
        orgaoExecutor: null,
        empresaVencedora: null,
        cnpjVencedora: null,
        valorVencedor: null,
        observacoes: "Importado automaticamente da base Transferegov ao marcar proponente como atendido.",
        ativo: true
      };

      try {
        const existing = await prisma.instrumentProposal.findFirst({
          where: {
            OR: [{ proposta }, { instrumento }]
          },
          select: { id: true }
        });

        if (existing) {
          await prisma.instrumentProposal.update({
            where: { id: existing.id },
            data: {
              objeto: dataPayload.objeto,
              valorRepasse: dataPayload.valorRepasse,
              valorContrapartida: dataPayload.valorContrapartida,
              dataAssinatura: dataPayload.dataAssinatura,
              vigenciaInicio: dataPayload.vigenciaInicio,
              vigenciaFim: dataPayload.vigenciaFim,
              dataPrestacaoContas: dataPayload.dataPrestacaoContas,
              dataDou: dataPayload.dataDou,
              concedente: dataPayload.concedente,
              banco: dataPayload.banco,
              agencia: dataPayload.agencia,
              conta: dataPayload.conta,
              conveneteId: dataPayload.conveneteId,
              fluxoTipo: dataPayload.fluxoTipo,
              status: dataPayload.status,
              responsavel: dataPayload.responsavel,
              orgaoExecutor: dataPayload.orgaoExecutor,
              empresaVencedora: dataPayload.empresaVencedora,
              cnpjVencedora: dataPayload.cnpjVencedora,
              valorVencedor: dataPayload.valorVencedor,
              observacoes: dataPayload.observacoes,
              ativo: true
            }
          });
          await ensureInstrumentSupportData(existing.id);
          atualizados += 1;
        } else {
          const created = await prisma.instrumentProposal.create({ data: dataPayload });
          await ensureInstrumentSupportData(created.id);
          criados += 1;
        }
      } catch {
        erros += 1;
      }
    }

    return {
      total_encontrado: rows.length,
      criados,
      atualizados,
      ignorados,
      erros
    };
  } catch (error) {
    if (isMissingTransferenciasTableError(error)) {
      return {
        total_encontrado: 0,
        criados: 0,
        atualizados: 0,
        ignorados: 0,
        erros: 0
      };
    }
    throw error;
  }
};

export const reimportarInstrumentosDoProponenteAtendido = async (conveneteId: number) => {
  const proponente = await prisma.convenete.findUnique({
    where: { id: conveneteId },
    select: { id: true, cnpj: true }
  });

  if (!proponente) {
    return null;
  }

  const cnpjDigits = proponente.cnpj.replace(/\D/g, "").trim();
  const importacao = await importarInstrumentosDoProponente(proponente.id, cnpjDigits);

  return {
    proponente_id: proponente.id,
    importacao
  };
};

export const reimportarInstrumentosTodosProponentesAtendidos = async () => {
  const proponentes = await prisma.convenete.findMany({
    select: { id: true, nome: true, cnpj: true },
    orderBy: [{ nome: "asc" }, { id: "asc" }]
  });

  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;
  let erros = 0;

  const itens: Array<{
    proponente_id: number;
    nome: string;
    importacao: {
      total_encontrado: number;
      criados: number;
      atualizados: number;
      ignorados: number;
      erros: number;
    };
  }> = [];

  for (const proponente of proponentes) {
    const cnpjDigits = proponente.cnpj.replace(/\D/g, "").trim();
    const importacao = await importarInstrumentosDoProponente(proponente.id, cnpjDigits);
    criados += importacao.criados;
    atualizados += importacao.atualizados;
    ignorados += importacao.ignorados;
    erros += importacao.erros;

    itens.push({
      proponente_id: proponente.id,
      nome: proponente.nome,
      importacao
    });
  }

  return {
    total_proponentes: proponentes.length,
    criados,
    atualizados,
    ignorados,
    erros,
    itens
  };
};

export const createConvenete = async (input: CreateConveneteInput) => {
  return prisma.convenete.create({
    data: {
      nome: input.nome,
      cnpj: input.cnpj,
      endereco: input.endereco,
      bairro: input.bairro,
      cep: input.cep,
      uf: input.uf,
      cidade: input.cidade,
      tel: input.tel,
      email: input.email
    }
  });
};

export const listConvenetes = async () => {
  return prisma.convenete.findMany({
    orderBy: [{ nome: "asc" }, { id: "asc" }]
  });
};

export const listProponenteSugestoesFromTransferencias = async (query: ProponenteSugestaoQueryInput) => {
  const term = query.q.trim();
  if (term.length < 2) {
    return [] as Array<{ cnpj: string; nome_proponente: string; uf: string | null; cidade: string | null }>;
  }

  const digits = term.replace(/\D/g, "").trim();
  const normalizedLike = `%${escapeLikeValue(term.toLowerCase())}%`;

  const filters: Prisma.Sql[] = [Prisma.sql`LOWER(nome_proponente) LIKE ${normalizedLike} ESCAPE '\\'`];
  if (digits.length >= 2) {
    filters.push(
      Prisma.sql`REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') LIKE ${`%${digits}%`}`
    );
  }

  const whereClause = Prisma.sql`
    WHERE cnpj IS NOT NULL
      AND TRIM(cnpj) <> ''
      AND nome_proponente IS NOT NULL
      AND TRIM(nome_proponente) <> ''
      AND (${Prisma.join(filters, " OR ")})
  `;

  try {
    const rows = await prisma.$queryRaw<
      Array<{
        cnpj: string | null;
        nome_proponente: string | null;
        uf: string | null;
        cidade: string | null;
        total: number | bigint | string;
      }>
    >(Prisma.sql`
      SELECT
        cnpj,
        nome_proponente,
        MAX(uf) AS uf,
        MAX(municipio) AS cidade,
        COUNT(*) AS total
      FROM ${Prisma.raw(TABLE_TRANSFERENCIAS_DISCRICIONARIAS)}
      ${whereClause}
      GROUP BY cnpj, nome_proponente
      ORDER BY total DESC, nome_proponente ASC, cnpj ASC
      LIMIT ${query.limit}
    `);

    return rows
      .map((row) => ({
        cnpj: row.cnpj?.replace(/\D/g, "").trim() ?? "",
        nome_proponente: row.nome_proponente?.trim() ?? "",
        uf: row.uf?.trim() ?? null,
        cidade: row.cidade?.trim() ?? null
      }))
      .filter((row) => row.cnpj !== "" && row.nome_proponente !== "");
  } catch (error) {
    if (isMissingTransferenciasTableError(error)) {
      return [] as Array<{ cnpj: string; nome_proponente: string; uf: string | null; cidade: string | null }>;
    }
    throw error;
  }
};

export const createConveneteFromProponente = async (input: CreateConveneteFromProponenteInput) => {
  const cnpjDigits = input.cnpj.replace(/\D/g, "").trim();
  const nomeProponente = input.nome_proponente.trim();
  const uf = input.uf?.trim().toUpperCase();
  const cidade = input.cidade?.trim();

  const updateData: Prisma.ConveneteUpdateInput = {
    nome: nomeProponente
  };

  if (uf && uf.length === 2) {
    updateData.uf = uf;
  }
  if (cidade && cidade.length > 0) {
    updateData.cidade = cidade;
  }

  const proponente = await prisma.convenete.upsert({
    where: { cnpj: cnpjDigits },
    update: updateData,
    create: {
      nome: nomeProponente,
      cnpj: cnpjDigits,
      endereco: "Origem Transferegov",
      bairro: "NAO INFORMADO",
      cep: "00000-000",
      uf: uf && uf.length === 2 ? uf : "NI",
      cidade: cidade && cidade.length > 0 ? cidade : "NAO INFORMADA",
      tel: "0000000000",
      email: `${cnpjDigits}@proponente.local`
    }
  });

  const importacao = await importarInstrumentosDoProponente(proponente.id, cnpjDigits);

  return {
    proponente,
    importacao
  };
};

export const getConveneteById = async (id: number) => {
  return prisma.convenete.findUnique({ where: { id } });
};

export const updateConvenete = async (id: number, input: UpdateConveneteInput) => {
  return prisma.convenete.update({
    where: { id },
    data: {
      nome: input.nome,
      cnpj: input.cnpj,
      endereco: input.endereco,
      bairro: input.bairro,
      cep: input.cep,
      uf: input.uf,
      cidade: input.cidade,
      tel: input.tel,
      email: input.email
    }
  });
};

export const deleteConvenete = async (id: number) => {
  return prisma.convenete.delete({ where: { id } });
};
