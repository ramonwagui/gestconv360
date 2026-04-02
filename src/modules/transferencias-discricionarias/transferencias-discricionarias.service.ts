import { Prisma } from "@prisma/client";
import { unzipSync } from "fflate";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import {
  TransferenciaDiscricionariaDesembolsoProponenteQueryInput,
  TransferenciaDiscricionariaDesembolsoQueryInput,
  TransferenciaDiscricionariaQueryInput
} from "./transferencias-discricionarias.schema";

type TransferenciaDiscricionariaItem = {
  id: number;
  nr_proposta: string | null;
  nr_convenio: string | null;
  uf: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  natureza_juridica: string | null;
  situacao_proposta: string | null;
  situacao_convenio: string | null;
  situacao_contratacao: string | null;
  objeto: string | null;
  ano_referencia: number | null;
  dia_assin_conv: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  dt_aprovacao_proposta: string | null;
  dt_conclusao_prestacao_contas: string | null;
  valor_global_conv: number | null;
  valor_desembolsado_conv: number | null;
  valor_pagamentos: number | null;
  valor_tributos: number | null;
  total_gasto: number | null;
  quantidade_convenios: number | null;
  qtd_tas_convenio: number | null;
  qtd_dias_prorroga: number | null;
  valor_contrapartida_financeira: number | null;
  dias_para_vencimento: number | null;
  link_acesso_livre: string | null;
  fonte_arquivo: string;
};

type TransferenciaDiscricionariaListResponse = {
  itens: TransferenciaDiscricionariaItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  sincronizacao: {
    data_carga_fonte: string | null;
    atualizado_em: string | null;
    status: string;
    detalhe: string | null;
    total_registros: number;
  };
};

type TransferenciaDiscricionariaDesembolsoItem = {
  id: number;
  id_desembolso: number | null;
  nr_convenio: string | null;
  data_desembolso: string | null;
  dt_ult_desembolso: string | null;
  ano_desembolso: number | null;
  mes_desembolso: number | null;
  qtd_dias_sem_desembolso: number | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | null;
  fonte_arquivo: string;
};

type TransferenciaDiscricionariaDesembolsoListResponse = {
  itens: TransferenciaDiscricionariaDesembolsoItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  resumo: {
    nr_convenio: string;
    total_desembolsos: number;
    valor_total_desembolsado: number;
  };
  sincronizacao: {
    data_carga_fonte: string | null;
    atualizado_em: string | null;
    status: string;
    detalhe: string | null;
    total_registros: number;
  };
};

type TransferenciaDiscricionariaDesembolsoProponenteItem = {
  id: number;
  id_desembolso: number | null;
  cnpj_proponente: string | null;
  nome_proponente: string | null;
  nr_convenio: string | null;
  objeto: string | null;
  valor_contrapartida_financeira: number | null;
  uf: string | null;
  municipio: string | null;
  data_desembolso: string | null;
  dt_ult_desembolso: string | null;
  ano_desembolso: number | null;
  mes_desembolso: number | null;
  qtd_dias_sem_desembolso: number | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | null;
  fonte_arquivo: string;
};

type TransferenciaDiscricionariaDesembolsoProponenteListResponse = {
  itens: TransferenciaDiscricionariaDesembolsoProponenteItem[];
  paginacao: {
    pagina: number;
    tamanho_pagina: number;
    total: number;
    total_paginas: number;
    tem_proxima: boolean;
    tem_anterior: boolean;
  };
  resumo: {
    cnpj: string | null;
    nome_proponente: string | null;
    total_desembolsos: number;
    total_convenios: number;
    valor_total_desembolsado: number;
  };
  sincronizacao: {
    data_carga_fonte: string | null;
    atualizado_em: string | null;
    status: string;
    detalhe: string | null;
    total_registros: number;
  };
};

type SyncState = {
  data_carga_fonte: string | null;
  atualizado_em: string | null;
  status: string;
  detalhe: string | null;
  total_registros: number;
};

type SyncResult = {
  skipped: boolean;
  data_carga_fonte: string;
  arquivos_processados: string[];
  total_registros: number;
  status: "ok" | "partial";
  detalhe: string | null;
};

type NormalizedImportRow = {
  chave_unica: string;
  fonte_arquivo: string;
  data_carga_fonte: string;
  tipo_ente: "estado" | "municipio";
  id_proposta: number | null;
  nr_proposta: string | null;
  nr_convenio: string | null;
  nr_convenio_norm: string | null;
  uf: string | null;
  municipio: string | null;
  cod_ibge: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  natureza_juridica: string | null;
  situacao_proposta: string | null;
  situacao_convenio: string | null;
  situacao_contratacao: string | null;
  objeto: string | null;
  link_acesso_livre: string | null;
  ano_referencia: number | null;
  dia_assin_conv: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  dt_aprovacao_proposta: string | null;
  dt_conclusao_prestacao_contas: string | null;
  valor_global_conv: number | null;
  valor_desembolsado_conv: number | null;
  valor_pagamentos: number | null;
  valor_tributos: number | null;
  total_gasto: number | null;
  quantidade_convenios: number | null;
  qtd_tas_convenio: number | null;
  qtd_dias_prorroga: number | null;
  valor_contrapartida_financeira: number | null;
  atualizado_em: string;
};

type NormalizedDesembolsoImportRow = {
  chave_unica: string;
  fonte_arquivo: string;
  data_carga_fonte: string;
  id_desembolso: number | null;
  nr_convenio: string | null;
  nr_convenio_norm: string | null;
  dt_ult_desembolso: string | null;
  qtd_dias_sem_desembolso: number | null;
  data_desembolso: string | null;
  ano_desembolso: number | null;
  mes_desembolso: number | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | null;
  atualizado_em: string;
};

type NormalizedPropostaImportRow = {
  chave_unica: string;
  id_proposta: number | null;
  nr_proposta: string | null;
  nr_proposta_norm: string | null;
  objeto: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  valor_contrapartida_financeira: number | null;
};

type RawCountRow = { total: number | bigint | string | null };

type RawListRow = {
  id: number | bigint | string;
  nr_proposta: string | null;
  nr_convenio: string | null;
  uf: string | null;
  cnpj: string | null;
  nome_proponente: string | null;
  natureza_juridica: string | null;
  situacao_proposta: string | null;
  situacao_convenio: string | null;
  situacao_contratacao: string | null;
  objeto: string | null;
  ano_referencia: number | bigint | string | null;
  dia_assin_conv: string | null;
  dia_inic_vigencia: string | null;
  dia_fim_vigencia: string | null;
  dt_aprovacao_proposta: string | null;
  dt_conclusao_prestacao_contas: string | null;
  valor_global_conv: number | string | null;
  valor_desembolsado_conv: number | string | null;
  valor_pagamentos: number | string | null;
  valor_tributos: number | string | null;
  total_gasto: number | string | null;
  quantidade_convenios: number | bigint | string | null;
  qtd_tas_convenio: number | bigint | string | null;
  qtd_dias_prorroga: number | bigint | string | null;
  valor_contrapartida_financeira: number | string | null;
  dias_para_vencimento: number | bigint | string | null;
  link_acesso_livre: string | null;
  fonte_arquivo: string;
};

type RawDesembolsoListRow = {
  id: number | bigint | string;
  id_desembolso: number | bigint | string | null;
  nr_convenio: string | null;
  dt_ult_desembolso: string | null;
  qtd_dias_sem_desembolso: number | bigint | string | null;
  data_desembolso: string | null;
  ano_desembolso: number | bigint | string | null;
  mes_desembolso: number | bigint | string | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | string | null;
  fonte_arquivo: string;
};

type RawDesembolsoProponenteListRow = {
  id: number | bigint | string;
  id_desembolso: number | bigint | string | null;
  cnpj_proponente: string | null;
  nome_proponente: string | null;
  nr_convenio: string | null;
  objeto: string | null;
  valor_contrapartida_financeira: number | string | null;
  uf: string | null;
  municipio: string | null;
  dt_ult_desembolso: string | null;
  qtd_dias_sem_desembolso: number | bigint | string | null;
  data_desembolso: string | null;
  ano_desembolso: number | bigint | string | null;
  mes_desembolso: number | bigint | string | null;
  nr_siafi: string | null;
  ug_emitente_dh: string | null;
  observacao_dh: string | null;
  vl_desembolsado: number | string | null;
  fonte_arquivo: string;
};

type RawDistinctTextRow = { value: string | null };

type RawProponenteSugestaoRow = {
  cnpj: string | null;
  nome_proponente: string | null;
  total: number | bigint | string;
};

const TABLE_MAIN = "transferencias_discricionarias";
const TABLE_STAGE = "transferencias_discricionarias_stage";
const TABLE_SYNC = "transferencias_discricionarias_sync";
const TABLE_CONTRAPARTIDA_STAGE = "transferencias_discricionarias_contrapartida_stage";
const TABLE_PROPOSTA_STAGE = "transferencias_discricionarias_proposta_stage";
const TABLE_DESEMBOLSO = "transferencias_discricionarias_desembolsos";
const TABLE_DESEMBOLSO_STAGE = "transferencias_discricionarias_desembolsos_stage";
const DESEMBOLSO_FILE = "siconv_desembolso.csv.zip";
const PROPOSTA_FILE = "siconv_proposta.csv.zip";
const INSERT_BATCH_SIZE = 300;
const VIGENCIA_FIM_ISO_SQL =
  "CASE " +
  "WHEN dia_fim_vigencia LIKE '__/__/____' THEN substr(dia_fim_vigencia, 7, 4) || '-' || substr(dia_fim_vigencia, 4, 2) || '-' || substr(dia_fim_vigencia, 1, 2) " +
  "WHEN dia_fim_vigencia LIKE '____-__-__' THEN substr(dia_fim_vigencia, 1, 10) " +
  "ELSE NULL END";

let tablesReadyPromise: Promise<void> | null = null;

const toNullableText = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimAndCompact = (input: string) => input.trim().replace(/\s+/g, " ");
  const maybeFixMojibake = (input: string) => {
    if (!/[ÃÂ]/.test(input)) {
      return input;
    }

    try {
      const repaired = Buffer.from(input, "latin1").toString("utf8");
      if (repaired.includes("\uFFFD")) {
        return input;
      }
      return repaired;
    } catch {
      return input;
    }
  };

  const compact = trimAndCompact(maybeFixMojibake(value));
  return compact === "" ? null : compact;
};

const toNullableInt = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.trunc(parsed);
};

const toNullableFloat = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toNullableDigits = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  return digits === "" ? null : digits;
};

const normalizeConvenioCode = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[./\-\s]/g, "").trim();
  return normalized === "" ? null : normalized;
};

const extractYearFromDateBr = (value: string | null) => {
  if (!value) {
    return null;
  }
  const match = value.match(/\b\d{2}\/\d{2}\/(\d{4})\b/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  return Number.isInteger(year) ? year : null;
};

const parseDateBrToIso = (value: string | null) => {
  if (!value) {
    return null;
  }
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
};

const normalizeCsvHeaderLine = (line: string) => line.replace(/^(?:\uFEFF|ï»¿)/, "");

const extractYearFromProposta = (value: string | null) => {
  if (!value) {
    return null;
  }
  const match = value.match(/\b(20\d{2})\b/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  return Number.isInteger(year) ? year : null;
};

const toInt = (value: number | bigint | string | null | undefined) => {
  if (value === null || value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};

const toNullableNumber = (value: number | bigint | string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const escapeLikeValue = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const splitCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ";" && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
};

const resolveTipoEnte = (fileName: string): "estado" | "municipio" => {
  const lower = fileName.toLowerCase();
  return lower.includes("municip") ? "municipio" : "estado";
};

const normalizeBaseUrl = () => {
  const base = env.transferenciasDiscricionariasSourceBaseUrl.trim();
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const getSourceFiles = () => {
  const raw = env.transferenciasDiscricionariasSourceFiles;
  const files = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "")
    .filter((item) => item.toLowerCase() !== DESEMBOLSO_FILE)
    .filter((item) => item.toLowerCase() !== PROPOSTA_FILE);
  if (files.length > 0) {
    return files;
  }
  return ["siconv_prop_inst_indicadores_estados.csv.zip"];
};

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/plain,application/zip,application/octet-stream;q=0.9,*/*;q=0.8"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
};

const downloadTextWithRetry = async (url: string) => {
  const timeoutMs = Math.max(5000, env.transferenciasDiscricionariasRequestTimeoutMs);
  const retries = Math.max(1, env.transferenciasDiscricionariasDownloadRetries);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return (await response.text()).trim();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  throw new Error(`Falha ao baixar ${url}: ${lastError instanceof Error ? lastError.message : "erro desconhecido"}`);
};

const downloadCsvBytesFromZipWithRetry = async (fileName: string) => {
  const timeoutMs = Math.max(10000, env.transferenciasDiscricionariasRequestTimeoutMs);
  const retries = Math.max(1, env.transferenciasDiscricionariasDownloadRetries);
  const url = `${normalizeBaseUrl()}/${fileName}`;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, timeoutMs);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const rawBuffer = new Uint8Array(await response.arrayBuffer());
      const unzipped = unzipSync(rawBuffer);
      const csvEntry = Object.keys(unzipped).find((entry) => entry.toLowerCase().endsWith(".csv"));
      if (!csvEntry) {
        throw new Error("Arquivo ZIP sem entrada CSV");
      }

      return unzipped[csvEntry];
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw new Error(`Falha ao baixar ${fileName}: ${lastError instanceof Error ? lastError.message : "erro desconhecido"}`);
};

const downloadCsvTextFromZipWithRetry = async (fileName: string, encoding: "utf-8" | "latin1" = "utf-8") => {
  const csvBytes = await downloadCsvBytesFromZipWithRetry(fileName);
  return new TextDecoder(encoding).decode(csvBytes);
};

const processCsvBytesByLine = async (
  csvBytes: Uint8Array,
  encoding: "utf-8" | "latin1",
  onLine: (line: string, lineIndex: number) => Promise<void> | void
) => {
  const decoder = new TextDecoder(encoding);
  const chunkSize = 1024 * 1024;
  let pending = "";
  let lineIndex = 0;

  for (let start = 0; start < csvBytes.length; start += chunkSize) {
    const end = Math.min(csvBytes.length, start + chunkSize);
    const chunkText = decoder.decode(csvBytes.subarray(start, end), { stream: end < csvBytes.length });
    pending += chunkText;

    let newlineIndex = pending.indexOf("\n");
    while (newlineIndex >= 0) {
      let line = pending.slice(0, newlineIndex);
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      await onLine(line, lineIndex);
      lineIndex += 1;

      pending = pending.slice(newlineIndex + 1);
      newlineIndex = pending.indexOf("\n");
    }
  }

  if (pending.length > 0) {
    await onLine(pending, lineIndex);
  }
};

const detectCsvEncoding = (csvBytes: Uint8Array): "utf-8" | "latin1" => {
  if (csvBytes.length >= 3 && csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf) {
    return "utf-8";
  }

  const sample = csvBytes.subarray(0, Math.min(csvBytes.length, 512 * 1024));
  const utf8 = new TextDecoder("utf-8").decode(sample);
  return utf8.includes("\uFFFD") ? "latin1" : "utf-8";
};

const ensureTables = async () => {
  if (!tablesReadyPromise) {
    tablesReadyPromise = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_MAIN} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chave_unica TEXT NOT NULL UNIQUE,
          fonte_arquivo TEXT NOT NULL,
          data_carga_fonte TEXT NOT NULL,
          tipo_ente TEXT NOT NULL,
          id_proposta INTEGER,
          nr_proposta TEXT,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          uf TEXT,
          municipio TEXT,
          cod_ibge TEXT,
          cnpj TEXT,
          nome_proponente TEXT,
          natureza_juridica TEXT,
          situacao_proposta TEXT,
          situacao_convenio TEXT,
          situacao_contratacao TEXT,
          objeto TEXT,
          link_acesso_livre TEXT,
          ano_referencia INTEGER,
          dia_assin_conv TEXT,
          dia_inic_vigencia TEXT,
          dia_fim_vigencia TEXT,
          dt_aprovacao_proposta TEXT,
          dt_conclusao_prestacao_contas TEXT,
          valor_global_conv REAL,
          valor_desembolsado_conv REAL,
          valor_pagamentos REAL,
          valor_tributos REAL,
          total_gasto REAL,
          quantidade_convenios INTEGER,
          qtd_tas_convenio INTEGER,
          qtd_dias_prorroga INTEGER,
          valor_contrapartida_financeira REAL,
          atualizado_em TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_STAGE} (
          chave_unica TEXT NOT NULL UNIQUE,
          fonte_arquivo TEXT NOT NULL,
          data_carga_fonte TEXT NOT NULL,
          tipo_ente TEXT NOT NULL,
          id_proposta INTEGER,
          nr_proposta TEXT,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          uf TEXT,
          municipio TEXT,
          cod_ibge TEXT,
          cnpj TEXT,
          nome_proponente TEXT,
          natureza_juridica TEXT,
          situacao_proposta TEXT,
          situacao_convenio TEXT,
          situacao_contratacao TEXT,
          objeto TEXT,
          link_acesso_livre TEXT,
          ano_referencia INTEGER,
          dia_assin_conv TEXT,
          dia_inic_vigencia TEXT,
          dia_fim_vigencia TEXT,
          dt_aprovacao_proposta TEXT,
          dt_conclusao_prestacao_contas TEXT,
          valor_global_conv REAL,
          valor_desembolsado_conv REAL,
          valor_pagamentos REAL,
          valor_tributos REAL,
          total_gasto REAL,
          quantidade_convenios INTEGER,
          qtd_tas_convenio INTEGER,
          qtd_dias_prorroga INTEGER,
          valor_contrapartida_financeira REAL,
          atualizado_em TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_CONTRAPARTIDA_STAGE} (
          nr_convenio TEXT NOT NULL PRIMARY KEY,
          valor_contrapartida_financeira REAL,
          dia_limite_prest_contas TEXT
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_PROPOSTA_STAGE} (
          chave_unica TEXT NOT NULL PRIMARY KEY,
          id_proposta INTEGER,
          nr_proposta TEXT,
          nr_proposta_norm TEXT,
          objeto TEXT,
          dia_inic_vigencia TEXT,
          dia_fim_vigencia TEXT,
          valor_contrapartida_financeira REAL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_DESEMBOLSO} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chave_unica TEXT NOT NULL UNIQUE,
          fonte_arquivo TEXT NOT NULL,
          data_carga_fonte TEXT NOT NULL,
          id_desembolso INTEGER,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          dt_ult_desembolso TEXT,
          qtd_dias_sem_desembolso INTEGER,
          data_desembolso TEXT,
          ano_desembolso INTEGER,
          mes_desembolso INTEGER,
          nr_siafi TEXT,
          ug_emitente_dh TEXT,
          observacao_dh TEXT,
          vl_desembolsado REAL,
          atualizado_em TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_DESEMBOLSO_STAGE} (
          chave_unica TEXT NOT NULL UNIQUE,
          fonte_arquivo TEXT NOT NULL,
          data_carga_fonte TEXT NOT NULL,
          id_desembolso INTEGER,
          nr_convenio TEXT,
          nr_convenio_norm TEXT,
          dt_ult_desembolso TEXT,
          qtd_dias_sem_desembolso INTEGER,
          data_desembolso TEXT,
          ano_desembolso INTEGER,
          mes_desembolso INTEGER,
          nr_siafi TEXT,
          ug_emitente_dh TEXT,
          observacao_dh TEXT,
          vl_desembolsado REAL,
          atualizado_em TEXT NOT NULL
        );
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${TABLE_SYNC} (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          data_carga_fonte TEXT,
          atualizado_em TEXT NOT NULL,
          status TEXT NOT NULL,
          detalhe TEXT,
          total_registros INTEGER NOT NULL DEFAULT 0
        );
      `);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_uf ON ${TABLE_MAIN} (uf);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_ano ON ${TABLE_MAIN} (ano_referencia);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_cnpj ON ${TABLE_MAIN} (cnpj);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_nr_convenio ON ${TABLE_MAIN} (nr_convenio);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_nr_proposta ON ${TABLE_MAIN} (nr_proposta);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_sit_prop ON ${TABLE_MAIN} (situacao_proposta);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_sit_conv ON ${TABLE_MAIN} (situacao_convenio);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_tipo_ente ON ${TABLE_MAIN} (tipo_ente);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_desembolso_conv ON ${TABLE_DESEMBOLSO} (nr_convenio);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_desembolso_data ON ${TABLE_DESEMBOLSO} (data_desembolso);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_desembolso_ano_mes ON ${TABLE_DESEMBOLSO} (ano_desembolso, mes_desembolso);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_prop_stage_id ON ${TABLE_PROPOSTA_STAGE} (id_proposta);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_prop_stage_nr_norm ON ${TABLE_PROPOSTA_STAGE} (nr_proposta_norm);`);

      const ensureOptionalColumn = async (tableName: string, columnName: string, sqlType: string) => {
        try {
          await prisma.$executeRawUnsafe(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType}`);
        } catch {
          // coluna ja existente
        }
      };

      await ensureOptionalColumn(TABLE_MAIN, "objeto", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "valor_contrapartida_financeira", "REAL");
      await ensureOptionalColumn(TABLE_MAIN, "dia_inic_vigencia", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "dia_fim_vigencia", "TEXT");
      await ensureOptionalColumn(TABLE_MAIN, "nr_convenio_norm", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "objeto", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "valor_contrapartida_financeira", "REAL");
      await ensureOptionalColumn(TABLE_STAGE, "dia_inic_vigencia", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "dia_fim_vigencia", "TEXT");
      await ensureOptionalColumn(TABLE_STAGE, "nr_convenio_norm", "TEXT");
      await ensureOptionalColumn(TABLE_DESEMBOLSO, "nr_convenio_norm", "TEXT");
      await ensureOptionalColumn(TABLE_DESEMBOLSO_STAGE, "nr_convenio_norm", "TEXT");
      await ensureOptionalColumn(TABLE_CONTRAPARTIDA_STAGE, "dia_limite_prest_contas", "TEXT");

      await prisma.$executeRawUnsafe(`
        UPDATE ${TABLE_MAIN}
        SET nr_convenio_norm = REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(nr_convenio, ''), '.', ''), '/', ''), '-', ''), ' ', '')
        WHERE nr_convenio IS NOT NULL
          AND TRIM(nr_convenio) <> ''
          AND (nr_convenio_norm IS NULL OR TRIM(nr_convenio_norm) = '')
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE ${TABLE_DESEMBOLSO}
        SET nr_convenio_norm = REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(nr_convenio, ''), '.', ''), '/', ''), '-', ''), ' ', '')
        WHERE nr_convenio IS NOT NULL
          AND TRIM(nr_convenio) <> ''
          AND (nr_convenio_norm IS NULL OR TRIM(nr_convenio_norm) = '')
      `);

      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_nr_convenio_norm ON ${TABLE_MAIN} (nr_convenio_norm);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_td_desembolso_conv_norm ON ${TABLE_DESEMBOLSO} (nr_convenio_norm);`);

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO ${Prisma.raw(TABLE_SYNC)} (id, data_carga_fonte, atualizado_em, status, detalhe, total_registros)
          VALUES (1, NULL, ${new Date(0).toISOString()}, ${"pending"}, NULL, 0)
          ON CONFLICT(id) DO NOTHING
        `
      );
    })();
  }

  await tablesReadyPromise;
};

export const ensureTransferenciasDiscricionariasStorage = async () => {
  await ensureTables();
};

const readSyncState = async (): Promise<SyncState> => {
  await ensureTables();
  const rows = await prisma.$queryRaw<
    Array<{
      data_carga_fonte: string | null;
      atualizado_em: string | null;
      status: string;
      detalhe: string | null;
      total_registros: number | bigint | string;
    }>
  >(Prisma.sql`SELECT data_carga_fonte, atualizado_em, status, detalhe, total_registros FROM ${Prisma.raw(TABLE_SYNC)} WHERE id = 1`);

  const row = rows[0];
  if (!row) {
    return {
      data_carga_fonte: null,
      atualizado_em: null,
      status: "pending",
      detalhe: null,
      total_registros: 0
    };
  }

  return {
    data_carga_fonte: row.data_carga_fonte,
    atualizado_em: row.atualizado_em,
    status: row.status,
    detalhe: row.detalhe,
    total_registros: toInt(row.total_registros)
  };
};

const writeSyncState = async (state: SyncState) => {
  await ensureTables();
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_SYNC)} (id, data_carga_fonte, atualizado_em, status, detalhe, total_registros)
      VALUES (1, ${state.data_carga_fonte}, ${state.atualizado_em ?? new Date().toISOString()}, ${state.status}, ${state.detalhe}, ${state.total_registros})
      ON CONFLICT(id) DO UPDATE SET
        data_carga_fonte = excluded.data_carga_fonte,
        atualizado_em = excluded.atualizado_em,
        status = excluded.status,
        detalhe = excluded.detalhe,
        total_registros = excluded.total_registros
    `
  );
};

const toInsertSqlRow = (row: NormalizedImportRow) => Prisma.sql`(
  ${row.chave_unica},
  ${row.fonte_arquivo},
  ${row.data_carga_fonte},
  ${row.tipo_ente},
  ${row.id_proposta},
  ${row.nr_proposta},
  ${row.nr_convenio},
  ${row.nr_convenio_norm},
  ${row.uf},
  ${row.municipio},
  ${row.cod_ibge},
  ${row.cnpj},
  ${row.nome_proponente},
  ${row.natureza_juridica},
  ${row.situacao_proposta},
  ${row.situacao_convenio},
  ${row.situacao_contratacao},
  ${row.objeto},
  ${row.link_acesso_livre},
  ${row.ano_referencia},
  ${row.dia_assin_conv},
  ${row.dia_inic_vigencia},
  ${row.dia_fim_vigencia},
  ${row.dt_aprovacao_proposta},
  ${row.dt_conclusao_prestacao_contas},
  ${row.valor_global_conv},
  ${row.valor_desembolsado_conv},
  ${row.valor_pagamentos},
  ${row.valor_tributos},
  ${row.total_gasto},
  ${row.quantidade_convenios},
  ${row.qtd_tas_convenio},
  ${row.qtd_dias_prorroga},
  ${row.valor_contrapartida_financeira},
  ${row.atualizado_em}
)`;

const insertStageBatch = async (rows: NormalizedImportRow[]) => {
  if (rows.length === 0) {
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_STAGE)} (
        chave_unica,
        fonte_arquivo,
        data_carga_fonte,
        tipo_ente,
        id_proposta,
        nr_proposta,
        nr_convenio,
        nr_convenio_norm,
        uf,
        municipio,
        cod_ibge,
        cnpj,
        nome_proponente,
        natureza_juridica,
        situacao_proposta,
        situacao_convenio,
        situacao_contratacao,
        objeto,
        link_acesso_livre,
        ano_referencia,
        dia_assin_conv,
        dia_inic_vigencia,
        dia_fim_vigencia,
        dt_aprovacao_proposta,
        dt_conclusao_prestacao_contas,
        valor_global_conv,
        valor_desembolsado_conv,
        valor_pagamentos,
        valor_tributos,
        total_gasto,
        quantidade_convenios,
        qtd_tas_convenio,
        qtd_dias_prorroga,
        valor_contrapartida_financeira,
        atualizado_em
      )
      VALUES ${Prisma.join(rows.map((row) => toInsertSqlRow(row)))}
    `
  );
};

const toInsertDesembolsoSqlRow = (row: NormalizedDesembolsoImportRow) => Prisma.sql`(
  ${row.chave_unica},
  ${row.fonte_arquivo},
  ${row.data_carga_fonte},
  ${row.id_desembolso},
  ${row.nr_convenio},
  ${row.nr_convenio_norm},
  ${row.dt_ult_desembolso},
  ${row.qtd_dias_sem_desembolso},
  ${row.data_desembolso},
  ${row.ano_desembolso},
  ${row.mes_desembolso},
  ${row.nr_siafi},
  ${row.ug_emitente_dh},
  ${row.observacao_dh},
  ${row.vl_desembolsado},
  ${row.atualizado_em}
)`;

const insertDesembolsoStageBatch = async (rows: NormalizedDesembolsoImportRow[]) => {
  if (rows.length === 0) {
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO ${Prisma.raw(TABLE_DESEMBOLSO_STAGE)} (
        chave_unica,
        fonte_arquivo,
        data_carga_fonte,
        id_desembolso,
        nr_convenio,
        nr_convenio_norm,
        dt_ult_desembolso,
        qtd_dias_sem_desembolso,
        data_desembolso,
        ano_desembolso,
        mes_desembolso,
        nr_siafi,
        ug_emitente_dh,
        observacao_dh,
        vl_desembolsado,
        atualizado_em
      )
      VALUES ${Prisma.join(rows.map((row) => toInsertDesembolsoSqlRow(row)))}
    `
  );
};

type ConvenioEnriquecimentoRow = {
  nr_convenio: string;
  valor_contrapartida_financeira: number | null;
  dia_limite_prest_contas: string | null;
};

const toInsertContrapartidaSqlRow = (row: ConvenioEnriquecimentoRow) =>
  Prisma.sql`(${row.nr_convenio}, ${row.valor_contrapartida_financeira}, ${row.dia_limite_prest_contas})`;

const insertContrapartidaStageBatch = async (rows: ConvenioEnriquecimentoRow[]) => {
  if (rows.length === 0) {
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT OR REPLACE INTO ${Prisma.raw(TABLE_CONTRAPARTIDA_STAGE)} (
        nr_convenio,
        valor_contrapartida_financeira,
        dia_limite_prest_contas
      )
      VALUES ${Prisma.join(rows.map((row) => toInsertContrapartidaSqlRow(row)))}
    `
  );
};

const enriquecerContrapartidaFinanceiraNaStage = async () => {
  const convenioFile = "siconv_convenio.csv.zip";
  const csvText = await downloadCsvTextFromZipWithRetry(convenioFile, "latin1");

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_CONTRAPARTIDA_STAGE}`);

  const lines = csvText.split(/\r?\n/);
  const headerLine = normalizeCsvHeaderLine(lines[0] ?? "");
  const headerCells = splitCsvLine(headerLine);
  const headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));

  const getCell = (column: string, cells: string[]) => {
    const index = headerIndexMap.get(column);
    if (index === undefined) {
      return null;
    }
    return cells[index] ?? "";
  };

  let batch: ConvenioEnriquecimentoRow[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertContrapartidaStageBatch(batch);
    batch = [];
  };

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line || line.trim() === "") {
      continue;
    }

    const cells = splitCsvLine(line);
    const nrConvenio = toNullableDigits(getCell("NR_CONVENIO", cells));
    const valorContrapartida = toNullableFloat(getCell("VL_CONTRAPARTIDA_CONV", cells));
    const diaLimitePrestContas = toNullableText(getCell("DIA_LIMITE_PREST_CONTAS", cells));

    if (!nrConvenio || (valorContrapartida === null && diaLimitePrestContas === null)) {
      continue;
    }

    batch.push({
      nr_convenio: nrConvenio,
      valor_contrapartida_financeira: valorContrapartida,
      dia_limite_prest_contas: diaLimitePrestContas
    });

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  }

  if (batch.length > 0) {
    await flushBatch();
  }

  await prisma.$executeRawUnsafe(`
    UPDATE ${TABLE_STAGE}
    SET
      valor_contrapartida_financeira = (
        SELECT cs.valor_contrapartida_financeira
        FROM ${TABLE_CONTRAPARTIDA_STAGE} cs
        WHERE cs.nr_convenio = REPLACE(REPLACE(REPLACE(REPLACE(${TABLE_STAGE}.nr_convenio, '.', ''), '/', ''), '-', ''), ' ', '')
      ),
      dt_conclusao_prestacao_contas = COALESCE(
        dt_conclusao_prestacao_contas,
        (
          SELECT cs.dia_limite_prest_contas
          FROM ${TABLE_CONTRAPARTIDA_STAGE} cs
          WHERE cs.nr_convenio = REPLACE(REPLACE(REPLACE(REPLACE(${TABLE_STAGE}.nr_convenio, '.', ''), '/', ''), '-', ''), ' ', '')
        )
      )
    WHERE EXISTS (
      SELECT 1
      FROM ${TABLE_CONTRAPARTIDA_STAGE} cs
      WHERE cs.nr_convenio = REPLACE(REPLACE(REPLACE(REPLACE(${TABLE_STAGE}.nr_convenio, '.', ''), '/', ''), '-', ''), ' ', '')
    )
  `);

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_CONTRAPARTIDA_STAGE}`);
};

const toInsertPropostaSqlRow = (row: NormalizedPropostaImportRow) => Prisma.sql`(
  ${row.chave_unica},
  ${row.id_proposta},
  ${row.nr_proposta},
  ${row.nr_proposta_norm},
  ${row.objeto},
  ${row.dia_inic_vigencia},
  ${row.dia_fim_vigencia},
  ${row.valor_contrapartida_financeira}
)`;

const insertPropostaStageBatch = async (rows: NormalizedPropostaImportRow[]) => {
  if (rows.length === 0) {
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT OR REPLACE INTO ${Prisma.raw(TABLE_PROPOSTA_STAGE)} (
        chave_unica,
        id_proposta,
        nr_proposta,
        nr_proposta_norm,
        objeto,
        dia_inic_vigencia,
        dia_fim_vigencia,
        valor_contrapartida_financeira
      )
      VALUES ${Prisma.join(rows.map((row) => toInsertPropostaSqlRow(row)))}
    `
  );
};

const enriquecerDadosPropostaNaStage = async () => {
  const csvBytes = await downloadCsvBytesFromZipWithRetry(PROPOSTA_FILE);
  const encoding = detectCsvEncoding(csvBytes);

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`);

  let totalInserted = 0;
  let batch: NormalizedPropostaImportRow[] = [];
  let headerIndexMap: Map<string, number> | null = null;

  const getCell = (column: string, cells: string[]) => {
    const index = headerIndexMap?.get(column);
    if (index === undefined) {
      return null;
    }
    return cells[index] ?? "";
  };

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertPropostaStageBatch(batch);
    totalInserted += batch.length;
    batch = [];
  };

  await processCsvBytesByLine(csvBytes, encoding, async (line, lineIndex) => {
    if (lineIndex === 0) {
      const headerLine = normalizeCsvHeaderLine(line ?? "");
      const headerCells = splitCsvLine(headerLine);
      headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));
      return;
    }

    if (!headerIndexMap || !line || line.trim() === "") {
      return;
    }

    const cells = splitCsvLine(line);
    const idProposta = toNullableInt(getCell("ID_PROPOSTA", cells));
    const nrProposta = toNullableText(getCell("NR_PROPOSTA", cells));
    const nrPropostaNorm = toNullableDigits(getCell("NR_PROPOSTA", cells));
    const objeto = toNullableText(getCell("OBJETO_PROPOSTA", cells));
    const diaInicVigencia = toNullableText(getCell("DIA_INIC_VIGENCIA_PROPOSTA", cells));
    const diaFimVigencia = toNullableText(getCell("DIA_FIM_VIGENCIA_PROPOSTA", cells));
    const valorContrapartida = toNullableFloat(getCell("VL_CONTRAPARTIDA_PROP", cells));

    if (idProposta === null && nrPropostaNorm === null && nrProposta === null) {
      return;
    }

    if (objeto === null && diaInicVigencia === null && diaFimVigencia === null && valorContrapartida === null) {
      return;
    }

    const keyBase =
      idProposta !== null
        ? `id:${idProposta}`
        : `nr:${nrPropostaNorm ?? nrProposta ?? "sem_nr"}|linha:${lineIndex + 1}`;

    batch.push({
      chave_unica: `proposta:${keyBase}`,
      id_proposta: idProposta,
      nr_proposta: nrProposta,
      nr_proposta_norm: nrPropostaNorm,
      objeto,
      dia_inic_vigencia: diaInicVigencia,
      dia_fim_vigencia: diaFimVigencia,
      valor_contrapartida_financeira: valorContrapartida
    });

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  });

  if (batch.length > 0) {
    await flushBatch();
  }

  const nrPropostaStageNormExpr =
    `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${TABLE_STAGE}.nr_proposta, ''), '.', ''), '/', ''), '-', ''), ' ', ''), ',', '')`;

  await prisma.$executeRawUnsafe(`
    UPDATE ${TABLE_STAGE}
    SET
      objeto = COALESCE(
        (
          SELECT ps.objeto
          FROM ${TABLE_PROPOSTA_STAGE} ps
          WHERE (
            (ps.id_proposta IS NOT NULL AND ps.id_proposta = ${TABLE_STAGE}.id_proposta)
            OR (ps.nr_proposta_norm IS NOT NULL AND ps.nr_proposta_norm = ${nrPropostaStageNormExpr})
          )
          AND ps.objeto IS NOT NULL
          LIMIT 1
        ),
        objeto
      ),
      dia_inic_vigencia = COALESCE(
        (
          SELECT ps.dia_inic_vigencia
          FROM ${TABLE_PROPOSTA_STAGE} ps
          WHERE (
            (ps.id_proposta IS NOT NULL AND ps.id_proposta = ${TABLE_STAGE}.id_proposta)
            OR (ps.nr_proposta_norm IS NOT NULL AND ps.nr_proposta_norm = ${nrPropostaStageNormExpr})
          )
          AND ps.dia_inic_vigencia IS NOT NULL
          LIMIT 1
        ),
        dia_inic_vigencia
      ),
      dia_fim_vigencia = COALESCE(
        (
          SELECT ps.dia_fim_vigencia
          FROM ${TABLE_PROPOSTA_STAGE} ps
          WHERE (
            (ps.id_proposta IS NOT NULL AND ps.id_proposta = ${TABLE_STAGE}.id_proposta)
            OR (ps.nr_proposta_norm IS NOT NULL AND ps.nr_proposta_norm = ${nrPropostaStageNormExpr})
          )
          AND ps.dia_fim_vigencia IS NOT NULL
          LIMIT 1
        ),
        dia_fim_vigencia
      ),
      valor_contrapartida_financeira = COALESCE(
        valor_contrapartida_financeira,
        (
          SELECT ps.valor_contrapartida_financeira
          FROM ${TABLE_PROPOSTA_STAGE} ps
          WHERE (
            (ps.id_proposta IS NOT NULL AND ps.id_proposta = ${TABLE_STAGE}.id_proposta)
            OR (ps.nr_proposta_norm IS NOT NULL AND ps.nr_proposta_norm = ${nrPropostaStageNormExpr})
          )
          AND ps.valor_contrapartida_financeira IS NOT NULL
          LIMIT 1
        )
      )
    WHERE EXISTS (
      SELECT 1
      FROM ${TABLE_PROPOSTA_STAGE} ps
      WHERE
        (
          (ps.id_proposta IS NOT NULL AND ps.id_proposta = ${TABLE_STAGE}.id_proposta)
          OR (ps.nr_proposta_norm IS NOT NULL AND ps.nr_proposta_norm = ${nrPropostaStageNormExpr})
        )
        AND (
          ps.objeto IS NOT NULL
          OR ps.dia_inic_vigencia IS NOT NULL
          OR ps.dia_fim_vigencia IS NOT NULL
          OR ps.valor_contrapartida_financeira IS NOT NULL
        )
    )
  `);

  await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`);

  return totalInserted;
};

const processCsvIntoStage = async (csvText: string, fileName: string, dataCargaFonte: string) => {
  const tipoEnte = resolveTipoEnte(fileName);
  const lines = csvText.split(/\r?\n/);
  const headerLine = normalizeCsvHeaderLine(lines[0] ?? "");
  const headerCells = splitCsvLine(headerLine);
  const headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));

  let totalInserted = 0;
  let batch: NormalizedImportRow[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertStageBatch(batch);
    totalInserted += batch.length;
    batch = [];
  };

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (line.trim() === "") {
      continue;
    }

    const getCell = (column: string, cells: string[]) => {
      const index = headerIndexMap.get(column);
      if (index === undefined) {
        return null;
      }
      return cells[index] ?? "";
    };

    const cells = splitCsvLine(line);
    const lineNumber = lineIndex + 1;
    const idProposta = toNullableInt(getCell("ID_PROPOSTA", cells));
    const nrProposta = toNullableText(getCell("NR_PROPOSTA", cells));
    const nrConvenio = toNullableText(getCell("NR_CONVENIO", cells));
    const diaAssinConv = toNullableText(getCell("DIA_ASSIN_CONV", cells));
    const dtAprovacaoProposta = toNullableText(getCell("DT_APROVACAO_PROPOSTA", cells));

    const anoReferencia =
      extractYearFromDateBr(diaAssinConv) ??
      extractYearFromDateBr(dtAprovacaoProposta) ??
      extractYearFromProposta(nrProposta);

    const baseKey =
      idProposta !== null
        ? `id:${idProposta}`
        : `nr:${nrProposta ?? "sem_proposta"}|conv:${nrConvenio ?? "sem_convenio"}|linha:${lineNumber}`;

    batch.push({
      chave_unica: `${tipoEnte}:${baseKey}`,
      fonte_arquivo: fileName,
      data_carga_fonte: dataCargaFonte,
      tipo_ente: tipoEnte,
      id_proposta: idProposta,
      nr_proposta: nrProposta,
      nr_convenio: nrConvenio,
      nr_convenio_norm: normalizeConvenioCode(nrConvenio),
      uf: toNullableText(getCell("UF_PROPONENTE", cells))?.toUpperCase() ?? null,
      municipio: toNullableText(getCell("MUNIC_PROPONENTE", cells)),
      cod_ibge: toNullableDigits(getCell("COD_MUNIC_IBGE", cells)),
      cnpj: toNullableDigits(getCell("CD_IDENTIF_PROPONENTE", cells)),
      nome_proponente: toNullableText(getCell("NM_PROPONENTE", cells)),
      natureza_juridica: toNullableText(getCell("NATUREZA_JURIDICA", cells)),
      situacao_proposta: toNullableText(getCell("SIT_PROPOSTA", cells)),
      situacao_convenio: toNullableText(getCell("SIT_CONVENIO", cells)),
      situacao_contratacao: toNullableText(getCell("SITUACAO_CONTRATACAO", cells)),
      objeto: toNullableText(getCell("OBJETO", cells)) ?? toNullableText(getCell("CUMPRIMENTO_OBJETO", cells)),
      link_acesso_livre: toNullableText(getCell("LINK_ACESSO_LIVRE", cells)),
      ano_referencia: anoReferencia,
      dia_assin_conv: diaAssinConv,
      dia_inic_vigencia: toNullableText(getCell("DIA_INIC_VIGENC_CONV", cells)),
      dia_fim_vigencia: toNullableText(getCell("DIA_FIM_VIGENC_CONV", cells)),
      dt_aprovacao_proposta: dtAprovacaoProposta,
      dt_conclusao_prestacao_contas: toNullableText(getCell("DT_CONCLUSAO_PRESTACAO_CONTAS", cells)),
      valor_global_conv: toNullableFloat(getCell("VL_GLOBAL_CONV", cells)),
      valor_desembolsado_conv: toNullableFloat(getCell("VL_DESEMBOLSADO_CONV", cells)),
      valor_pagamentos: toNullableFloat(getCell("VL_PAGAMENTOS", cells)),
      valor_tributos: toNullableFloat(getCell("VL_TRIBUTOS", cells)),
      total_gasto: toNullableFloat(getCell("TOTAL_GASTO", cells)),
      quantidade_convenios: toNullableInt(getCell("QTDE_CONVENIOS", cells)),
      qtd_tas_convenio: toNullableInt(getCell("QTD_TAS_CONVENIO", cells)),
      qtd_dias_prorroga: toNullableInt(getCell("QTD_DIAS_PRORROGA", cells)),
      valor_contrapartida_financeira: null,
      atualizado_em: new Date().toISOString()
    });

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  }

  if (batch.length > 0) {
    await insertStageBatch(batch);
    totalInserted += batch.length;
  }

  return totalInserted;
};

const processCsvDesembolsoIntoStage = async (csvText: string, fileName: string, dataCargaFonte: string) => {
  const lines = csvText.split(/\r?\n/);
  const headerLine = normalizeCsvHeaderLine(lines[0] ?? "");
  const headerCells = splitCsvLine(headerLine);
  const headerIndexMap = new Map(headerCells.map((column, index) => [column.trim(), index]));

  const getCell = (column: string, cells: string[]) => {
    const index = headerIndexMap.get(column);
    if (index === undefined) {
      return null;
    }
    return cells[index] ?? "";
  };

  let totalInserted = 0;
  let batch: NormalizedDesembolsoImportRow[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) {
      return;
    }
    await insertDesembolsoStageBatch(batch);
    totalInserted += batch.length;
    batch = [];
  };

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (!line || line.trim() === "") {
      continue;
    }

    const cells = splitCsvLine(line);
    const lineNumber = lineIndex + 1;
    const idDesembolso = toNullableInt(getCell("ID_DESEMBOLSO", cells));
    const nrConvenio = toNullableText(getCell("NR_CONVENIO", cells));

    const baseKey =
      idDesembolso !== null
        ? `id:${idDesembolso}`
        : `conv:${nrConvenio ?? "sem_convenio"}|linha:${lineNumber}`;

    batch.push({
      chave_unica: `desembolso:${baseKey}`,
      fonte_arquivo: fileName,
      data_carga_fonte: dataCargaFonte,
      id_desembolso: idDesembolso,
      nr_convenio: nrConvenio,
      nr_convenio_norm: normalizeConvenioCode(nrConvenio),
      dt_ult_desembolso: toNullableText(getCell("DT_ULT_DESEMBOLSO", cells)),
      qtd_dias_sem_desembolso: toNullableInt(getCell("QTD_DIAS_SEM_DESEMBOLSO", cells)),
      data_desembolso: toNullableText(getCell("DATA_DESEMBOLSO", cells)),
      ano_desembolso: toNullableInt(getCell("ANO_DESEMBOLSO", cells)),
      mes_desembolso: toNullableInt(getCell("MES_DESEMBOLSO", cells)),
      nr_siafi: toNullableText(getCell("NR_SIAFI", cells)),
      ug_emitente_dh: toNullableText(getCell("UG_EMITENTE_DH", cells)),
      observacao_dh: toNullableText(getCell("OBSERVACAO_DH", cells)),
      vl_desembolsado: toNullableFloat(getCell("VL_DESEMBOLSADO", cells)),
      atualizado_em: new Date().toISOString()
    });

    if (batch.length >= INSERT_BATCH_SIZE) {
      await flushBatch();
    }
  }

  if (batch.length > 0) {
    await flushBatch();
  }

  return totalInserted;
};

const mapRawListItem = (item: RawListRow): TransferenciaDiscricionariaItem => ({
  id: toInt(item.id),
  nr_proposta: item.nr_proposta,
  nr_convenio: item.nr_convenio,
  uf: item.uf,
  cnpj: item.cnpj,
  nome_proponente: item.nome_proponente,
  natureza_juridica: item.natureza_juridica,
  situacao_proposta: item.situacao_proposta,
  situacao_convenio: item.situacao_convenio,
  situacao_contratacao: item.situacao_contratacao,
  objeto: item.objeto,
  ano_referencia: item.ano_referencia === null ? null : toInt(item.ano_referencia),
  dia_assin_conv: item.dia_assin_conv,
  dia_inic_vigencia: item.dia_inic_vigencia,
  dia_fim_vigencia: item.dia_fim_vigencia,
  dt_aprovacao_proposta: item.dt_aprovacao_proposta,
  dt_conclusao_prestacao_contas: item.dt_conclusao_prestacao_contas,
  valor_global_conv: toNullableNumber(item.valor_global_conv),
  valor_desembolsado_conv: toNullableNumber(item.valor_desembolsado_conv),
  valor_pagamentos: toNullableNumber(item.valor_pagamentos),
  valor_tributos: toNullableNumber(item.valor_tributos),
  total_gasto: toNullableNumber(item.total_gasto),
  quantidade_convenios: item.quantidade_convenios === null ? null : toInt(item.quantidade_convenios),
  qtd_tas_convenio: item.qtd_tas_convenio === null ? null : toInt(item.qtd_tas_convenio),
  qtd_dias_prorroga: item.qtd_dias_prorroga === null ? null : toInt(item.qtd_dias_prorroga),
  valor_contrapartida_financeira: toNullableNumber(item.valor_contrapartida_financeira),
  dias_para_vencimento: item.dias_para_vencimento === null ? null : toInt(item.dias_para_vencimento),
  link_acesso_livre: item.link_acesso_livre,
  fonte_arquivo: item.fonte_arquivo
});

const mapRawDesembolsoListItem = (item: RawDesembolsoListRow): TransferenciaDiscricionariaDesembolsoItem => ({
  id: toInt(item.id),
  id_desembolso: item.id_desembolso === null ? null : toInt(item.id_desembolso),
  nr_convenio: item.nr_convenio,
  data_desembolso: parseDateBrToIso(item.data_desembolso),
  dt_ult_desembolso: parseDateBrToIso(item.dt_ult_desembolso),
  ano_desembolso: item.ano_desembolso === null ? null : toInt(item.ano_desembolso),
  mes_desembolso: item.mes_desembolso === null ? null : toInt(item.mes_desembolso),
  qtd_dias_sem_desembolso: item.qtd_dias_sem_desembolso === null ? null : toInt(item.qtd_dias_sem_desembolso),
  nr_siafi: item.nr_siafi,
  ug_emitente_dh: item.ug_emitente_dh,
  observacao_dh: item.observacao_dh,
  vl_desembolsado: toNullableNumber(item.vl_desembolsado),
  fonte_arquivo: item.fonte_arquivo
});

const mapRawDesembolsoProponenteListItem = (
  item: RawDesembolsoProponenteListRow
): TransferenciaDiscricionariaDesembolsoProponenteItem => ({
  id: toInt(item.id),
  id_desembolso: item.id_desembolso === null ? null : toInt(item.id_desembolso),
  cnpj_proponente: item.cnpj_proponente,
  nome_proponente: item.nome_proponente,
  nr_convenio: item.nr_convenio,
  objeto: item.objeto,
  valor_contrapartida_financeira: toNullableNumber(item.valor_contrapartida_financeira),
  uf: item.uf,
  municipio: item.municipio,
  data_desembolso: parseDateBrToIso(item.data_desembolso),
  dt_ult_desembolso: parseDateBrToIso(item.dt_ult_desembolso),
  ano_desembolso: item.ano_desembolso === null ? null : toInt(item.ano_desembolso),
  mes_desembolso: item.mes_desembolso === null ? null : toInt(item.mes_desembolso),
  qtd_dias_sem_desembolso: item.qtd_dias_sem_desembolso === null ? null : toInt(item.qtd_dias_sem_desembolso),
  nr_siafi: item.nr_siafi,
  ug_emitente_dh: item.ug_emitente_dh,
  observacao_dh: item.observacao_dh,
  vl_desembolsado: toNullableNumber(item.vl_desembolsado),
  fonte_arquivo: item.fonte_arquivo
});

const loadDistinctTextValues = async (columnName: "uf" | "situacao_proposta" | "situacao_convenio") => {
  await ensureTables();
  const rows = await prisma.$queryRaw<RawDistinctTextRow[]>(Prisma.sql`
    SELECT DISTINCT ${Prisma.raw(columnName)} AS value
    FROM ${Prisma.raw(TABLE_MAIN)}
    WHERE ${Prisma.raw(columnName)} IS NOT NULL AND TRIM(${Prisma.raw(columnName)}) <> ''
    ORDER BY ${Prisma.raw(columnName)} ASC
  `);
  return rows.map((row) => row.value?.trim()).filter((value): value is string => Boolean(value));
};

export const listarTransferenciasDiscricionarias = async (
  query: TransferenciaDiscricionariaQueryInput
): Promise<TransferenciaDiscricionariaListResponse> => {
  await ensureTables();

  const conditions: Prisma.Sql[] = [];
  const vigenciaFimIsoExpr = Prisma.raw(VIGENCIA_FIM_ISO_SQL);

  if (query.uf) {
    conditions.push(Prisma.sql`uf = ${query.uf}`);
  }
  if (query.ano !== undefined) {
    conditions.push(Prisma.sql`ano_referencia = ${query.ano}`);
  }
  if (query.tipo_ente) {
    conditions.push(Prisma.sql`tipo_ente = ${query.tipo_ente}`);
  }
  if (query.cnpj) {
    conditions.push(Prisma.sql`cnpj = ${query.cnpj}`);
  }

  const likeFilter = (columnName: string, value: string | undefined) => {
    if (!value) {
      return;
    }
    const normalized = `%${escapeLikeValue(value.toLowerCase())}%`;
    conditions.push(Prisma.sql`LOWER(${Prisma.raw(columnName)}) LIKE ${normalized} ESCAPE '\\'`);
  };

  const likeOrDigitsFilter = (columnName: string, value: string | undefined) => {
    if (!value) {
      return;
    }

    const normalized = `%${escapeLikeValue(value.toLowerCase())}%`;
    const digits = value.replace(/\D/g, "");
    if (digits.length === 0) {
      conditions.push(Prisma.sql`LOWER(${Prisma.raw(columnName)}) LIKE ${normalized} ESCAPE '\\'`);
      return;
    }

    const digitsLike = `%${digits}%`;
    const columnDigits = Prisma.sql`REPLACE(REPLACE(REPLACE(REPLACE(${Prisma.raw(columnName)}, '.', ''), '/', ''), '-', ''), ' ', '')`;
    conditions.push(
      Prisma.sql`(LOWER(${Prisma.raw(columnName)}) LIKE ${normalized} ESCAPE '\\' OR ${columnDigits} LIKE ${digitsLike})`
    );
  };

  likeFilter("nome_proponente", query.nome_proponente);
  likeFilter("municipio", query.municipio);
  likeFilter("situacao_proposta", query.situacao_proposta);
  likeFilter("situacao_convenio", query.situacao_convenio);
  likeOrDigitsFilter("nr_convenio", query.nr_convenio);
  likeOrDigitsFilter("nr_proposta", query.nr_proposta);

  if (query.vigencia_a_vencer_dias !== undefined) {
    const limiteModifier = `+${query.vigencia_a_vencer_dias} day`;
    conditions.push(Prisma.sql`date(${vigenciaFimIsoExpr}) IS NOT NULL`);
    conditions.push(Prisma.sql`date(${vigenciaFimIsoExpr}) >= date('now', 'localtime')`);
    conditions.push(Prisma.sql`date(${vigenciaFimIsoExpr}) <= date('now', 'localtime', ${limiteModifier})`);
  }

  const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;
  const orderByClause =
    query.vigencia_a_vencer_dias !== undefined
      ? Prisma.sql`ORDER BY COALESCE(dias_para_vencimento, 999999) ASC, id DESC`
      : Prisma.sql`ORDER BY COALESCE(ano_referencia, 0) DESC, id DESC`;

  const page = query.page;
  const pageSize = query.page_size;
  const offset = (page - 1) * pageSize;

  const countRows = await prisma.$queryRaw<RawCountRow[]>(
    Prisma.sql`SELECT COUNT(*) AS total FROM ${Prisma.raw(TABLE_MAIN)} ${whereClause}`
  );
  const total = toInt(countRows[0]?.total ?? 0);
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  const rows = await prisma.$queryRaw<RawListRow[]>(Prisma.sql`
    SELECT
      id,
      nr_proposta,
      nr_convenio,
      uf,
      cnpj,
      nome_proponente,
      natureza_juridica,
      situacao_proposta,
      situacao_convenio,
      situacao_contratacao,
      objeto,
      ano_referencia,
      dia_assin_conv,
      dia_inic_vigencia,
      dia_fim_vigencia,
      dt_aprovacao_proposta,
      dt_conclusao_prestacao_contas,
      valor_global_conv,
      valor_desembolsado_conv,
      valor_pagamentos,
      valor_tributos,
      total_gasto,
      quantidade_convenios,
      qtd_tas_convenio,
      qtd_dias_prorroga,
      valor_contrapartida_financeira,
      CAST(julianday(date(${vigenciaFimIsoExpr})) - julianday(date('now', 'localtime')) AS INTEGER) AS dias_para_vencimento,
      link_acesso_livre,
      fonte_arquivo
    FROM ${Prisma.raw(TABLE_MAIN)}
    ${whereClause}
    ${orderByClause}
    LIMIT ${pageSize}
    OFFSET ${offset}
  `);

  const syncState = await readSyncState();

  return {
    itens: rows.map(mapRawListItem),
    paginacao: {
      pagina: page,
      tamanho_pagina: pageSize,
      total,
      total_paginas: totalPaginas,
      tem_proxima: page < totalPaginas,
      tem_anterior: page > 1
    },
    sincronizacao: {
      data_carga_fonte: syncState.data_carga_fonte,
      atualizado_em: syncState.atualizado_em,
      status: syncState.status,
      detalhe: syncState.detalhe,
      total_registros: syncState.total_registros
    }
  };
};

export const listarDesembolsosTransferenciasDiscricionarias = async (
  query: TransferenciaDiscricionariaDesembolsoQueryInput
): Promise<TransferenciaDiscricionariaDesembolsoListResponse> => {
  await ensureTables();

  const conditions: Prisma.Sql[] = [];
  const nrConvenioNorm = normalizeConvenioCode(query.nr_convenio);
  if (nrConvenioNorm) {
    conditions.push(Prisma.sql`nr_convenio_norm LIKE ${`%${nrConvenioNorm}%`}`);
  } else {
    const normalized = `%${escapeLikeValue(query.nr_convenio.toLowerCase())}%`;
    conditions.push(Prisma.sql`LOWER(nr_convenio) LIKE ${normalized} ESCAPE '\\'`);
  }

  if (query.ano !== undefined) {
    conditions.push(Prisma.sql`ano_desembolso = ${query.ano}`);
  }
  if (query.mes !== undefined) {
    conditions.push(Prisma.sql`mes_desembolso = ${query.mes}`);
  }

  const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;

  const page = query.page;
  const pageSize = query.page_size;
  const offset = (page - 1) * pageSize;

  const [countRows, rows, resumoRows, syncState] = await Promise.all([
    prisma.$queryRaw<RawCountRow[]>(Prisma.sql`SELECT COUNT(*) AS total FROM ${Prisma.raw(TABLE_DESEMBOLSO)} ${whereClause}`),
    prisma.$queryRaw<RawDesembolsoListRow[]>(Prisma.sql`
      SELECT
        id,
        id_desembolso,
        nr_convenio,
        dt_ult_desembolso,
        qtd_dias_sem_desembolso,
        data_desembolso,
        ano_desembolso,
        mes_desembolso,
        nr_siafi,
        ug_emitente_dh,
        observacao_dh,
        vl_desembolsado,
        fonte_arquivo
      FROM ${Prisma.raw(TABLE_DESEMBOLSO)}
      ${whereClause}
      ORDER BY COALESCE(ano_desembolso, 0) DESC, COALESCE(mes_desembolso, 0) DESC, id DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<Array<{ total_desembolsos: number | bigint | string; valor_total_desembolsado: number | string | null }>>(Prisma.sql`
      SELECT COUNT(*) AS total_desembolsos, COALESCE(SUM(vl_desembolsado), 0) AS valor_total_desembolsado
      FROM ${Prisma.raw(TABLE_DESEMBOLSO)}
      ${whereClause}
    `),
    readSyncState()
  ]);

  const total = toInt(countRows[0]?.total ?? 0);
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const resumo = resumoRows[0] ?? { total_desembolsos: 0, valor_total_desembolsado: 0 };

  return {
    itens: rows.map(mapRawDesembolsoListItem),
    paginacao: {
      pagina: page,
      tamanho_pagina: pageSize,
      total,
      total_paginas: totalPaginas,
      tem_proxima: page < totalPaginas,
      tem_anterior: page > 1
    },
    resumo: {
      nr_convenio: query.nr_convenio,
      total_desembolsos: toInt(resumo.total_desembolsos),
      valor_total_desembolsado: toNullableNumber(resumo.valor_total_desembolsado) ?? 0
    },
    sincronizacao: {
      data_carga_fonte: syncState.data_carga_fonte,
      atualizado_em: syncState.atualizado_em,
      status: syncState.status,
      detalhe: syncState.detalhe,
      total_registros: syncState.total_registros
    }
  };
};

export const listarDesembolsosPorProponenteTransferenciasDiscricionarias = async (
  query: TransferenciaDiscricionariaDesembolsoProponenteQueryInput
): Promise<TransferenciaDiscricionariaDesembolsoProponenteListResponse> => {
  await ensureTables();

  const conditions: Prisma.Sql[] = [];

  if (query.cnpj) {
    const cnpjDigits = query.cnpj.replace(/\D/g, "").trim();
    if (cnpjDigits.length > 0) {
      conditions.push(Prisma.sql`p.cnpj LIKE ${`%${cnpjDigits}%`}`);
    }
  }

  if (query.nome_proponente) {
    const nomeLike = `%${escapeLikeValue(query.nome_proponente.toLowerCase())}%`;
    conditions.push(Prisma.sql`LOWER(p.nome_proponente) LIKE ${nomeLike} ESCAPE '\\'`);
  }

  if (query.ano !== undefined) {
    conditions.push(Prisma.sql`d.ano_desembolso = ${query.ano}`);
  }

  if (query.mes !== undefined) {
    conditions.push(Prisma.sql`d.mes_desembolso = ${query.mes}`);
  }

  const whereClause = conditions.length > 0 ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty;

  const fromClause = Prisma.sql`
    FROM ${Prisma.raw(TABLE_DESEMBOLSO)} d
    INNER JOIN (
      SELECT
        nr_convenio_norm,
        MAX(cnpj) AS cnpj,
        MAX(nome_proponente) AS nome_proponente,
        MAX(objeto) AS objeto,
        MAX(valor_contrapartida_financeira) AS valor_contrapartida_financeira,
        MAX(uf) AS uf,
        MAX(municipio) AS municipio
      FROM ${Prisma.raw(TABLE_MAIN)}
      WHERE nr_convenio_norm IS NOT NULL AND TRIM(nr_convenio_norm) <> ''
      GROUP BY nr_convenio_norm
    ) p ON p.nr_convenio_norm = d.nr_convenio_norm
  `;

  const page = query.page;
  const pageSize = query.page_size;
  const offset = (page - 1) * pageSize;

  const [countRows, rows, resumoRows, syncState] = await Promise.all([
    prisma.$queryRaw<RawCountRow[]>(Prisma.sql`SELECT COUNT(*) AS total ${fromClause} ${whereClause}`),
    prisma.$queryRaw<RawDesembolsoProponenteListRow[]>(Prisma.sql`
      SELECT
        d.id,
        d.id_desembolso,
        p.cnpj AS cnpj_proponente,
        p.nome_proponente,
        d.nr_convenio,
        p.objeto,
        p.valor_contrapartida_financeira,
        p.uf,
        p.municipio,
        d.dt_ult_desembolso,
        d.qtd_dias_sem_desembolso,
        d.data_desembolso,
        d.ano_desembolso,
        d.mes_desembolso,
        d.nr_siafi,
        d.ug_emitente_dh,
        d.observacao_dh,
        d.vl_desembolsado,
        d.fonte_arquivo
      ${fromClause}
      ${whereClause}
      ORDER BY COALESCE(d.ano_desembolso, 0) DESC, COALESCE(d.mes_desembolso, 0) DESC, d.id DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `),
    prisma.$queryRaw<
      Array<{
        cnpj: string | null;
        nome_proponente: string | null;
        total_desembolsos: number | bigint | string;
        total_convenios: number | bigint | string;
        valor_total_desembolsado: number | string | null;
      }>
    >(Prisma.sql`
      SELECT
        MAX(p.cnpj) AS cnpj,
        MAX(p.nome_proponente) AS nome_proponente,
        COUNT(*) AS total_desembolsos,
        COUNT(DISTINCT d.nr_convenio) AS total_convenios,
        COALESCE(SUM(d.vl_desembolsado), 0) AS valor_total_desembolsado
      ${fromClause}
      ${whereClause}
    `),
    readSyncState()
  ]);

  const total = toInt(countRows[0]?.total ?? 0);
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const resumo = resumoRows[0] ?? {
    cnpj: null,
    nome_proponente: null,
    total_desembolsos: 0,
    total_convenios: 0,
    valor_total_desembolsado: 0
  };

  return {
    itens: rows.map(mapRawDesembolsoProponenteListItem),
    paginacao: {
      pagina: page,
      tamanho_pagina: pageSize,
      total,
      total_paginas: totalPaginas,
      tem_proxima: page < totalPaginas,
      tem_anterior: page > 1
    },
    resumo: {
      cnpj: resumo.cnpj,
      nome_proponente: resumo.nome_proponente,
      total_desembolsos: toInt(resumo.total_desembolsos),
      total_convenios: toInt(resumo.total_convenios),
      valor_total_desembolsado: toNullableNumber(resumo.valor_total_desembolsado) ?? 0
    },
    sincronizacao: {
      data_carga_fonte: syncState.data_carga_fonte,
      atualizado_em: syncState.atualizado_em,
      status: syncState.status,
      detalhe: syncState.detalhe,
      total_registros: syncState.total_registros
    }
  };
};

export const listarFiltrosTransferenciasDiscricionarias = async () => {
  const [ufs, situacoesProposta, situacoesConvenio] = await Promise.all([
    loadDistinctTextValues("uf"),
    loadDistinctTextValues("situacao_proposta"),
    loadDistinctTextValues("situacao_convenio")
  ]);

  return {
    ufs,
    situacoes_proposta: situacoesProposta,
    situacoes_convenio: situacoesConvenio
  };
};

export const listarSugestoesProponentePorCnpj = async (cnpj: string, limit = 10) => {
  await ensureTables();

  const cnpjDigits = cnpj.replace(/\D/g, "").trim();
  if (cnpjDigits.length < 4) {
    return [] as Array<{ cnpj: string; nome_proponente: string }>;
  }

  const like = `${escapeLikeValue(cnpjDigits)}%`;
  const rows = await prisma.$queryRaw<RawProponenteSugestaoRow[]>(Prisma.sql`
    SELECT cnpj, nome_proponente, COUNT(*) AS total
    FROM ${Prisma.raw(TABLE_MAIN)}
    WHERE cnpj IS NOT NULL
      AND nome_proponente IS NOT NULL
      AND cnpj LIKE ${like} ESCAPE '\\'
    GROUP BY cnpj, nome_proponente
    ORDER BY total DESC, cnpj ASC, nome_proponente ASC
    LIMIT ${Math.max(1, Math.min(limit, 20))}
  `);

  return rows
    .map((row) => ({
      cnpj: row.cnpj?.trim() ?? "",
      nome_proponente: row.nome_proponente?.trim() ?? ""
    }))
    .filter((row) => row.cnpj !== "" && row.nome_proponente !== "");
};

export const sincronizarTransferenciasDiscricionarias = async (force = false): Promise<SyncResult> => {
  await ensureTables();

  const nowIso = new Date().toISOString();
  const dataCargaUrl = `${normalizeBaseUrl()}/data_carga_siconv.txt`;
  const dataCargaFonte = await downloadTextWithRetry(dataCargaUrl);
  const previousSync = await readSyncState();

  if (!force && previousSync.data_carga_fonte === dataCargaFonte && previousSync.status === "ok") {
    return {
      skipped: true,
      data_carga_fonte: dataCargaFonte,
      arquivos_processados: [],
      total_registros: previousSync.total_registros,
      status: "ok",
      detalhe: "Sem atualizacao na fonte desde a ultima carga."
    };
  }

  await writeSyncState({
    data_carga_fonte: dataCargaFonte,
    atualizado_em: nowIso,
    status: "running",
    detalhe: "Sincronizacao em andamento.",
    total_registros: previousSync.total_registros
  });

  const sourceFiles = getSourceFiles();
  const warnings: string[] = [];
  const arquivosProcessados: string[] = [];

  try {
    await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_STAGE}`);
    await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`);
    await prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_DESEMBOLSO_STAGE}`);

    let totalRegistros = 0;
    let totalRegistrosProposta = 0;
    let totalRegistrosDesembolso = 0;

    for (const sourceFile of sourceFiles) {
      try {
        const csvText = await downloadCsvTextFromZipWithRetry(sourceFile);
        const inserted = await processCsvIntoStage(csvText, sourceFile, dataCargaFonte);
        if (inserted > 0) {
          arquivosProcessados.push(sourceFile);
          totalRegistros += inserted;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "erro desconhecido";
        warnings.push(`${sourceFile}: ${message}`);
      }
    }

    try {
      await enriquecerContrapartidaFinanceiraNaStage();
      arquivosProcessados.push("siconv_convenio.csv.zip");
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      warnings.push(`siconv_convenio.csv.zip: ${message}`);
    }

    try {
      const inserted = await enriquecerDadosPropostaNaStage();
      arquivosProcessados.push(PROPOSTA_FILE);
      totalRegistrosProposta = inserted;
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      warnings.push(`${PROPOSTA_FILE}: ${message}`);
    }

    try {
      const csvText = await downloadCsvTextFromZipWithRetry(DESEMBOLSO_FILE, "latin1");
      const inserted = await processCsvDesembolsoIntoStage(csvText, DESEMBOLSO_FILE, dataCargaFonte);
      if (inserted > 0) {
        arquivosProcessados.push(DESEMBOLSO_FILE);
        totalRegistrosDesembolso = inserted;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "erro desconhecido";
      warnings.push(`${DESEMBOLSO_FILE}: ${message}`);
    }

    if (totalRegistros === 0) {
      throw new Error("Nenhum arquivo foi processado com sucesso.");
    }

    const totalRegistrosGerais = totalRegistros + totalRegistrosProposta + totalRegistrosDesembolso;

    await prisma.$transaction([
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_MAIN}`),
      prisma.$executeRawUnsafe(`
        INSERT INTO ${TABLE_MAIN} (
          chave_unica,
          fonte_arquivo,
          data_carga_fonte,
          tipo_ente,
          id_proposta,
          nr_proposta,
          nr_convenio,
          nr_convenio_norm,
          uf,
          municipio,
          cod_ibge,
          cnpj,
          nome_proponente,
          natureza_juridica,
          situacao_proposta,
          situacao_convenio,
          situacao_contratacao,
          objeto,
          link_acesso_livre,
          ano_referencia,
          dia_assin_conv,
          dia_inic_vigencia,
          dia_fim_vigencia,
          dt_aprovacao_proposta,
          dt_conclusao_prestacao_contas,
          valor_global_conv,
          valor_desembolsado_conv,
          valor_pagamentos,
          valor_tributos,
          total_gasto,
          quantidade_convenios,
          qtd_tas_convenio,
          qtd_dias_prorroga,
          valor_contrapartida_financeira,
          atualizado_em
        )
        SELECT
          chave_unica,
          fonte_arquivo,
          data_carga_fonte,
          tipo_ente,
          id_proposta,
          nr_proposta,
          nr_convenio,
          nr_convenio_norm,
          uf,
          municipio,
          cod_ibge,
          cnpj,
          nome_proponente,
          natureza_juridica,
          situacao_proposta,
          situacao_convenio,
          situacao_contratacao,
          objeto,
          link_acesso_livre,
          ano_referencia,
          dia_assin_conv,
          dia_inic_vigencia,
          dia_fim_vigencia,
          dt_aprovacao_proposta,
          dt_conclusao_prestacao_contas,
          valor_global_conv,
          valor_desembolsado_conv,
          valor_pagamentos,
          valor_tributos,
          total_gasto,
          quantidade_convenios,
          qtd_tas_convenio,
          qtd_dias_prorroga,
          valor_contrapartida_financeira,
          atualizado_em
        FROM ${TABLE_STAGE}
      `),
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_STAGE}`),
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_PROPOSTA_STAGE}`),
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_DESEMBOLSO}`),
      prisma.$executeRawUnsafe(`
        INSERT INTO ${TABLE_DESEMBOLSO} (
          chave_unica,
          fonte_arquivo,
          data_carga_fonte,
          id_desembolso,
          nr_convenio,
          nr_convenio_norm,
          dt_ult_desembolso,
          qtd_dias_sem_desembolso,
          data_desembolso,
          ano_desembolso,
          mes_desembolso,
          nr_siafi,
          ug_emitente_dh,
          observacao_dh,
          vl_desembolsado,
          atualizado_em
        )
        SELECT
          chave_unica,
          fonte_arquivo,
          data_carga_fonte,
          id_desembolso,
          nr_convenio,
          nr_convenio_norm,
          dt_ult_desembolso,
          qtd_dias_sem_desembolso,
          data_desembolso,
          ano_desembolso,
          mes_desembolso,
          nr_siafi,
          ug_emitente_dh,
          observacao_dh,
          vl_desembolsado,
          atualizado_em
        FROM ${TABLE_DESEMBOLSO_STAGE}
      `),
      prisma.$executeRawUnsafe(`DELETE FROM ${TABLE_DESEMBOLSO_STAGE}`)
    ]);

    const status: "ok" | "partial" = warnings.length > 0 ? "partial" : "ok";
    const detalhe = warnings.length > 0 ? warnings.join(" | ") : null;

    await writeSyncState({
      data_carga_fonte: dataCargaFonte,
      atualizado_em: new Date().toISOString(),
      status,
      detalhe,
      total_registros: totalRegistrosGerais
    });

    return {
      skipped: false,
      data_carga_fonte: dataCargaFonte,
      arquivos_processados: arquivosProcessados,
      total_registros: totalRegistrosGerais,
      status,
      detalhe
    };
  } catch (error) {
    await writeSyncState({
      data_carga_fonte: dataCargaFonte,
      atualizado_em: new Date().toISOString(),
      status: "error",
      detalhe: error instanceof Error ? error.message : "Falha desconhecida na sincronizacao.",
      total_registros: previousSync.total_registros
    });
    throw error;
  }
};

export const obterStatusSincronizacaoTransferenciasDiscricionarias = async () => {
  return readSyncState();
};
