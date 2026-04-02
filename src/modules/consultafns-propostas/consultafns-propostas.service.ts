import { env } from "../../config/env";
import {
  ConsultaFnsMunicipiosQueryInput,
  ConsultaFnsPropostasQueryInput,
  ConsultaFnsSyncBodyInput
} from "./consultafns-propostas.schema";

type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

type ConsultaFnsEnvelope<T> = {
  resultado: T;
};

type SyncState = {
  status: "idle" | "running" | "ok" | "error";
  atualizado_em: string | null;
  detalhe: string | null;
  total_requisicoes: number;
  total_itens: number;
  falhas: number;
};

const cache = new Map<string, CacheEntry>();

const syncState: SyncState = {
  status: "idle",
  atualizado_em: null,
  detalhe: null,
  total_requisicoes: 0,
  total_itens: 0,
  falhas: 0
};

const normalizeBaseUrl = () => {
  const base = env.consultaFnsBaseUrl.trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const getTimeoutMs = () => {
  if (!Number.isFinite(env.consultaFnsTimeoutMs)) {
    return 20000;
  }
  return Math.max(2000, env.consultaFnsTimeoutMs);
};

const getCacheTtlMs = () => {
  if (!Number.isFinite(env.consultaFnsCacheTtlMs)) {
    return 600000;
  }
  return Math.max(0, env.consultaFnsCacheTtlMs);
};

const fetchConsultaFns = async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
  const url = new URL(`${normalizeBaseUrl()}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  const cacheKey = url.toString();
  const now = Date.now();
  const ttl = getCacheTtlMs();

  if (ttl > 0) {
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha ao consultar Consulta FNS (${response.status}). ${detail || ""}`.trim());
  }

  const payload = (await response.json()) as ConsultaFnsEnvelope<T>;
  const value = payload?.resultado;

  if (ttl > 0) {
    cache.set(cacheKey, {
      value,
      expiresAt: Date.now() + ttl
    });
  }

  return value;
};

export const listarConsultaFnsUfs = async () => {
  return fetchConsultaFns<Array<{ coUfIbge: string; sigla: string; nome: string; id: string }>>("/recursos/ufs");
};

export const listarConsultaFnsAnos = async () => {
  return fetchConsultaFns<Array<{ valor: string; descricao: string }>>("/recursos/anos");
};

export const listarConsultaFnsMunicipios = async (query: ConsultaFnsMunicipiosQueryInput) => {
  return fetchConsultaFns<Array<{ coMunicipioIbge: string; noMunicipio: string; sgUf: string }>>(
    `/recursos/municipios/proposta/uf/${query.uf}`
  );
};

export const listarConsultaFnsPropostas = async (query: ConsultaFnsPropostasQueryInput) => {
  const page = query.page;
  const count = query.count;

  const resultado = await fetchConsultaFns<{
    itensPagina: Array<{
      coTipoProposta: string;
      dsTipoRecurso: string;
      nuProposta?: string;
      noEntidade?: string;
      vlProposta: number;
      vlPago: number;
      vlPagar: number;
      nuProcesso?: string;
      constituidoProcesso: boolean;
    }>;
    numeroPagina: number;
    tamanhoPagina: number;
    totalItens: number;
    totalPaginas: number;
  }>("/recursos/proposta/consultar", {
    ano: query.ano,
    sgUf: query.uf,
    coMunicipioIbge: query.co_municipio_ibge,
    nuProposta: query.nu_proposta,
    tpProposta: query.tp_proposta,
    tpRecurso: query.tp_recurso,
    tpEmenda: query.tp_emenda,
    page,
    count
  });

  return {
    itens: resultado.itensPagina,
    paginacao: {
      pagina: (resultado.numeroPagina ?? 0) + 1,
      tamanho_pagina: resultado.tamanhoPagina ?? count,
      total: resultado.totalItens ?? 0,
      total_paginas: resultado.totalPaginas ?? 1,
      tem_proxima: (resultado.numeroPagina ?? 0) + 1 < (resultado.totalPaginas ?? 1),
      tem_anterior: (resultado.numeroPagina ?? 0) > 0
    }
  };
};

export const obterConsultaFnsProposta = async (nuProposta: string) => {
  const raw = await fetchConsultaFns<{
    nuProposta: string;
    sgUf: string;
    noMunicipio: string;
    cnpj: string;
    noEntidade: string;
    coTipoProposta: string;
    vlProposta: number;
    nuAnoProposta: string;
    dsTipoRecurso: string;
    coEsfera: string;
    nuPortaria: string | null;
    nuProcesso: string | null;
    dtPortaria: number | null;
    situacao: {
      descricaoSituacaoproposta: string;
      dataSituacaoProjeto?: number | null;
    };
    vlEmpenhado: number;
    vlPago: number;
    vlPagar: number;
    parlamentares: Array<{
      sgPartido: string;
      noApelidoPolitico: string;
      vlIndObjeto: number;
      coEmendaPolitica: string;
      nuAnoExercicio: string;
    }>;
    pagamentos: Array<{
      dtCriacaoSiafi: number;
      nuParcela: string;
      localizacao: string;
      nuProcesso: string;
      nuOb: string;
      vlLiquido: number;
      vlAcumulado: number;
    }>;
    constituidoProcesso: boolean;
  }>("/recursos/proposta/obter-proposta", { nuProposta });

  return {
    nuProposta: raw?.nuProposta ?? nuProposta,
    sgUf: raw?.sgUf ?? "",
    noMunicipio: raw?.noMunicipio ?? "",
    cnpj: raw?.cnpj ?? "",
    noEntidade: raw?.noEntidade ?? "",
    coTipoProposta: raw?.coTipoProposta ?? "",
    vlProposta: Number(raw?.vlProposta ?? 0),
    nuAnoProposta: raw?.nuAnoProposta ?? "",
    dsTipoRecurso: raw?.dsTipoRecurso ?? "",
    coEsfera: raw?.coEsfera ?? "",
    nuPortaria: raw?.nuPortaria ?? null,
    nuProcesso: raw?.nuProcesso ?? null,
    dtPortaria: raw?.dtPortaria ?? null,
    situacao: {
      descricaoSituacaoproposta: raw?.situacao?.descricaoSituacaoproposta ?? "Nao informada",
      dataSituacaoProjeto: raw?.situacao?.dataSituacaoProjeto ?? null
    },
    vlEmpenhado: Number(raw?.vlEmpenhado ?? 0),
    vlPago: Number(raw?.vlPago ?? 0),
    vlPagar: Number(raw?.vlPagar ?? 0),
    parlamentares: Array.isArray(raw?.parlamentares) ? raw.parlamentares : [],
    pagamentos: Array.isArray(raw?.pagamentos) ? raw.pagamentos : [],
    constituidoProcesso: Boolean(raw?.constituidoProcesso)
  };
};

export const obterConsultaFnsEtapasProposta = async () => {
  return fetchConsultaFns<Record<string, Array<{ etapa: number; descricao: string; situacoes: number[] }>>>(
    "/recursos/proposta/obter-proposta-etapa"
  );
};

export const sincronizarConsultaFnsCache = async (payload: ConsultaFnsSyncBodyInput) => {
  if (syncState.status === "running") {
    return {
      status: "running",
      message: "Sincronizacao ja em andamento."
    };
  }

  syncState.status = "running";
  syncState.atualizado_em = new Date().toISOString();
  syncState.detalhe = "Iniciando aquecimento de cache Consulta FNS.";
  syncState.total_requisicoes = 0;
  syncState.total_itens = 0;
  syncState.falhas = 0;

  const ano = payload.ano ?? new Date().getFullYear();

  try {
    await listarConsultaFnsUfs();
    syncState.total_requisicoes += 1;

    await listarConsultaFnsAnos();
    syncState.total_requisicoes += 1;

    for (let page = 1; page <= payload.pages_max; page += 1) {
      try {
        const pageData = await listarConsultaFnsPropostas({ ano, page, count: payload.count });
        syncState.total_requisicoes += 1;
        syncState.total_itens += pageData.itens.length;
      } catch {
        syncState.falhas += 1;
      }
    }

    syncState.status = syncState.falhas > 0 ? "error" : "ok";
    syncState.atualizado_em = new Date().toISOString();
    syncState.detalhe = `Concluido com ${syncState.total_itens} item(ns) aquecidos.`;

    return {
      status: syncState.status,
      atualizado_em: syncState.atualizado_em,
      detalhe: syncState.detalhe,
      total_requisicoes: syncState.total_requisicoes,
      total_itens: syncState.total_itens,
      falhas: syncState.falhas
    };
  } catch (error) {
    syncState.status = "error";
    syncState.atualizado_em = new Date().toISOString();
    syncState.falhas += 1;
    syncState.detalhe = error instanceof Error ? error.message : "Falha na sincronizacao do cache Consulta FNS.";
    throw error;
  }
};

export const obterStatusSyncConsultaFns = () => ({
  ...syncState,
  ttl_cache_ms: getCacheTtlMs(),
  entradas_cache: cache.size
});
