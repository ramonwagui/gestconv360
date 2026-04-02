import { env } from "../../config/env";
import { PlanoAcaoEspecialQueryInput } from "./transferencias-especiais.schema";

type PlanoAcaoEspecialApiRow = {
  id_plano_acao: number;
  codigo_plano_acao: string;
  ano_plano_acao: number;
  modalidade_plano_acao: string;
  situacao_plano_acao: string;
  cnpj_beneficiario_plano_acao: string;
  nome_beneficiario_plano_acao: string;
  uf_beneficiario_plano_acao: string;
  nome_parlamentar_emenda_plano_acao: string | null;
  valor_custeio_plano_acao: number | string | null;
  valor_investimento_plano_acao: number | string | null;
  id_programa: number;
};

type PlanoAcaoEspecialListResponse = {
  itens: Array<{
    id_plano_acao: number;
    codigo_plano_acao: string;
    ano_plano_acao: number;
    modalidade_plano_acao: string;
    situacao_plano_acao: string;
    cnpj_beneficiario_plano_acao: string;
    nome_beneficiario_plano_acao: string;
    uf_beneficiario_plano_acao: string;
    nome_parlamentar_emenda_plano_acao: string | null;
    valor_custeio_plano_acao: number;
    valor_investimento_plano_acao: number;
    id_programa: number;
  }>;
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  cache: {
    ttl_ms: number;
    em_cache: boolean;
    atualizado_em: string;
  };
};

const DEFAULT_SELECT = [
  "id_plano_acao",
  "codigo_plano_acao",
  "ano_plano_acao",
  "modalidade_plano_acao",
  "situacao_plano_acao",
  "cnpj_beneficiario_plano_acao",
  "nome_beneficiario_plano_acao",
  "uf_beneficiario_plano_acao",
  "nome_parlamentar_emenda_plano_acao",
  "valor_custeio_plano_acao",
  "valor_investimento_plano_acao",
  "id_programa"
].join(",");

const cacheStore = new Map<
  string,
  {
    expiresAt: number;
    data: PlanoAcaoEspecialListResponse;
  }
>();

const parseContentRangeTotal = (contentRange: string | null): number | null => {
  if (!contentRange) {
    return null;
  }
  const match = contentRange.match(/\/(\*|\d+)$/);
  if (!match || match[1] === "*") {
    return null;
  }
  const total = Number(match[1]);
  return Number.isFinite(total) ? total : null;
};

const sanitizeIlikeValue = (value: string) => value.replace(/\*/g, "").trim();

const toNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeBaseUrl = () => {
  const base = env.transferenciasEspeciaisBaseUrl.trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const getTimeoutMs = () => {
  if (!Number.isFinite(env.transferenciasEspeciaisTimeoutMs)) {
    return 15000;
  }
  return Math.max(2000, env.transferenciasEspeciaisTimeoutMs);
};

const getCacheTtlMs = () => {
  if (!Number.isFinite(env.transferenciasEspeciaisCacheTtlMs)) {
    return 60000;
  }
  return Math.max(0, env.transferenciasEspeciaisCacheTtlMs);
};

const maybeCleanupCache = () => {
  if (cacheStore.size < 250) {
    return;
  }
  const now = Date.now();
  for (const [key, value] of cacheStore.entries()) {
    if (value.expiresAt <= now) {
      cacheStore.delete(key);
    }
  }
  if (cacheStore.size <= 200) {
    return;
  }
  const keys = Array.from(cacheStore.keys());
  for (let index = 0; index < keys.length - 200; index += 1) {
    cacheStore.delete(keys[index]);
  }
};

export const listarPlanosAcaoEspeciais = async (
  query: PlanoAcaoEspecialQueryInput
): Promise<PlanoAcaoEspecialListResponse> => {
  const page = query.page;
  const pageSize = query.page_size;
  const offset = (page - 1) * pageSize;

  const url = new URL(`${normalizeBaseUrl()}/plano_acao_especial`);
  url.searchParams.set("select", DEFAULT_SELECT);
  url.searchParams.set("order", "id_plano_acao.desc");
  url.searchParams.set("limit", String(pageSize));
  url.searchParams.set("offset", String(offset));

  if (query.cnpj) {
    url.searchParams.set("cnpj_beneficiario_plano_acao", `eq.${query.cnpj}`);
  }
  if (query.uf) {
    url.searchParams.set("uf_beneficiario_plano_acao", `eq.${query.uf}`);
  }
  if (query.ano !== undefined) {
    url.searchParams.set("ano_plano_acao", `eq.${query.ano}`);
  }
  if (query.situacao) {
    url.searchParams.set("situacao_plano_acao", `ilike.*${sanitizeIlikeValue(query.situacao)}*`);
  }
  if (query.nome_beneficiario) {
    url.searchParams.set("nome_beneficiario_plano_acao", `ilike.*${sanitizeIlikeValue(query.nome_beneficiario)}*`);
  }
  if (query.codigo_plano_acao) {
    url.searchParams.set("codigo_plano_acao", `ilike.*${sanitizeIlikeValue(query.codigo_plano_acao)}*`);
  }
  if (query.parlamentar) {
    url.searchParams.set(
      "nome_parlamentar_emenda_plano_acao",
      `ilike.*${sanitizeIlikeValue(query.parlamentar)}*`
    );
  }

  const cacheKey = url.toString();
  const ttlMs = getCacheTtlMs();
  const now = Date.now();
  if (ttlMs > 0) {
    const cached = cacheStore.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        ...cached.data,
        cache: {
          ...cached.data.cache,
          em_cache: true
        }
      };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        Prefer: "count=exact"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha na API do Transferegov (${response.status}). ${detail || ""}`.trim());
  }

  const payload = (await response.json()) as PlanoAcaoEspecialApiRow[];
  const total = parseContentRangeTotal(response.headers.get("content-range")) ?? offset + payload.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  const data: PlanoAcaoEspecialListResponse = {
    itens: payload.map((item) => ({
      id_plano_acao: item.id_plano_acao,
      codigo_plano_acao: item.codigo_plano_acao,
      ano_plano_acao: item.ano_plano_acao,
      modalidade_plano_acao: item.modalidade_plano_acao,
      situacao_plano_acao: item.situacao_plano_acao,
      cnpj_beneficiario_plano_acao: item.cnpj_beneficiario_plano_acao,
      nome_beneficiario_plano_acao: item.nome_beneficiario_plano_acao,
      uf_beneficiario_plano_acao: item.uf_beneficiario_plano_acao,
      nome_parlamentar_emenda_plano_acao: item.nome_parlamentar_emenda_plano_acao,
      valor_custeio_plano_acao: toNumber(item.valor_custeio_plano_acao),
      valor_investimento_plano_acao: toNumber(item.valor_investimento_plano_acao),
      id_programa: item.id_programa
    })),
    paginacao: {
      pagina: page,
      tamanho_pagina: pageSize,
      total,
      total_paginas: totalPaginas,
      tem_proxima: page < totalPaginas,
      tem_anterior: page > 1
    },
    cache: {
      ttl_ms: ttlMs,
      em_cache: false,
      atualizado_em: new Date().toISOString()
    }
  };

  if (ttlMs > 0) {
    maybeCleanupCache();
    cacheStore.set(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      data
    });
  }

  return data;
};
