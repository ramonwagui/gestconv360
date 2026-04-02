import fs from "fs";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";

import {
  DocumentAiCategory,
  DocumentAiRiskLevel,
  DocumentIndexStatus,
  DocumentStatus
} from "@prisma/client";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;
const extractTextFromPdf = async (buffer: Buffer) => {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    await parser.destroy().catch(() => undefined);
  }
};

type DocumentSearchFilters = {
  q: string;
  status?: DocumentStatus;
  createdByUserId?: number;
  dataDe?: string;
  dataAte?: string;
  limit?: number;
};

type RankedChunk = {
  chunkIndex: number;
  content: string;
  score: number;
  embedding?: number[] | null;
};

type DocumentClassification = {
  category: DocumentAiCategory | null;
  riskLevel: DocumentAiRiskLevel | null;
  confidence: number | null;
  insights: string | null;
};

const splitTerms = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);

const normalizeText = (value: string) => {
  return value
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
};

const chunkText = (value: string) => {
  const chunks: string[] = [];
  if (!value.trim()) {
    return chunks;
  }

  let cursor = 0;
  while (cursor < value.length) {
    const end = Math.min(value.length, cursor + CHUNK_SIZE);
    const slice = value.slice(cursor, end).trim();
    if (slice.length > 0) {
      chunks.push(slice);
    }
    if (end === value.length) {
      break;
    }
    cursor = Math.max(0, end - CHUNK_OVERLAP);
  }

  return chunks;
};

const getSnippet = (content: string, q: string) => {
  const normalizedQ = q.trim().toLowerCase();
  if (!normalizedQ) {
    return content.slice(0, 200);
  }

  const lower = content.toLowerCase();
  const index = lower.indexOf(normalizedQ);
  if (index === -1) {
    return content.slice(0, 200);
  }

  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + normalizedQ.length + 120);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";
  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
};

const normalizeForSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const extractCurrencyValues = (value: string) => {
  const matches = value.match(/R\$\s?\d{1,3}(?:\.\d{3})*,\d{2}/g);
  return matches ?? [];
};

const parseCurrencyBr = (value: string) => {
  const numeric = value.replace(/R\$\s?/g, "").replace(/\./g, "").replace(",", ".").trim();
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : null;
};

const scoreByKeywords = (source: string, keywords: string[]) => {
  let score = 0;
  for (const keyword of keywords) {
    if (source.includes(keyword)) {
      score += 1;
    }
  }
  return score;
};

const classifyDocumentHeuristic = (titulo: string, text: string): DocumentClassification => {
  const source = normalizeForSearch(`${titulo}\n${text}`);

  const categoryCandidates: Array<{ category: DocumentAiCategory; score: number }> = [
    {
      category: DocumentAiCategory.CONTRATO,
      score: scoreByKeywords(source, [
        "contrato",
        "clausula",
        "contratante",
        "contratada",
        "vigencia",
        "objeto contratual"
      ])
    },
    {
      category: DocumentAiCategory.OFICIO,
      score: scoreByKeywords(source, ["oficio", "senhor", "encaminho", "atenciosamente", "comunicamos"])
    },
    {
      category: DocumentAiCategory.RELATORIO,
      score: scoreByKeywords(source, ["relatorio", "analise", "resultado", "indicadores", "acompanhamento"])
    },
    {
      category: DocumentAiCategory.PRESTACAO_CONTAS,
      score: scoreByKeywords(source, [
        "prestacao de contas",
        "execucao financeira",
        "balancete",
        "demonstrativo",
        "receita",
        "glosa"
      ])
    },
    {
      category: DocumentAiCategory.COMPROVANTE,
      score: scoreByKeywords(source, [
        "declaracao de contrapartida",
        "declaracao",
        "declaro",
        "comprovante",
        "certidao",
        "nota fiscal",
        "recibo"
      ])
    }
  ];

  const bestCategory = categoryCandidates.sort((a, b) => b.score - a.score)[0];
  const category = bestCategory.score > 0 ? bestCategory.category : DocumentAiCategory.OUTROS;

  let riskLevel: DocumentAiRiskLevel = DocumentAiRiskLevel.BAIXO;
  const criticalHits = scoreByKeywords(source, ["fraude", "desvio", "tomada de contas", "improbidade", "dano ao erario"]);
  const highHits = scoreByKeywords(source, [
    "irregularidade",
    "inadimplencia",
    "suspensao",
    "bloqueio",
    "pendencia grave",
    "glosa"
  ]);
  const mediumHits = scoreByKeywords(source, [
    "pendencia",
    "atraso",
    "notificacao",
    "ressalva",
    "revisao",
    "inconsistencia"
  ]);

  if (criticalHits > 0) {
    riskLevel = DocumentAiRiskLevel.CRITICO;
  } else if (highHits > 0) {
    riskLevel = DocumentAiRiskLevel.ALTO;
  } else if (mediumHits > 0) {
    riskLevel = DocumentAiRiskLevel.MEDIO;
  }

  const values = extractCurrencyValues(text)
    .map(parseCurrencyBr)
    .filter((item): item is number => item !== null);
  const maxValue = values.length > 0 ? Math.max(...values) : 0;

  if (riskLevel === DocumentAiRiskLevel.BAIXO && maxValue >= 1_000_000) {
    riskLevel = DocumentAiRiskLevel.MEDIO;
  }

  const confidenceBase = category === DocumentAiCategory.OUTROS ? 0.45 : 0.68;
  const confidenceBoost = Math.min(bestCategory.score, 5) * 0.05;
  const confidence = Math.max(0, Math.min(0.95, confidenceBase + confidenceBoost));

  const insights = [
    `Classificacao heuristica: categoria ${category}, risco ${riskLevel}.`,
    bestCategory.score > 0 ? `Ocorrencias de termos-chave da categoria: ${bestCategory.score}.` : "Sem termos fortes de categoria; classificado como OUTROS.",
    maxValue > 0 ? `Maior valor monetario identificado: R$ ${maxValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.` : "Nenhum valor monetario relevante identificado."
  ].join(" ");

  return {
    category,
    riskLevel,
    confidence,
    insights: insights.slice(0, 1800)
  };
};

const buildHeuristicAnswer = (question: string, ranked: RankedChunk[], allChunks: RankedChunk[]) => {
  const normalizedQuestion = normalizeForSearch(question);
  const asksValue = normalizedQuestion.includes("valor") || normalizedQuestion.includes("quanto");
  if (!asksValue) {
    return null;
  }

  const mentionsCounterpart =
    normalizedQuestion.includes("contrapartida") ||
    normalizedQuestion.includes("financeira") ||
    normalizedQuestion.includes("aporte");

  const source = [...ranked, ...allChunks.filter((chunk) => !ranked.some((rankedChunk) => rankedChunk.chunkIndex === chunk.chunkIndex))];

  const weighted = source
    .map((item) => {
      const normalizedContent = normalizeForSearch(item.content);
      const hasCounterpart =
        normalizedContent.includes("contrapartida") || normalizedContent.includes("financeira");
      const values = extractCurrencyValues(item.content);
      return {
        item,
        values,
        score: item.score + (hasCounterpart ? 8 : 0)
      };
    })
    .filter((item) => item.values.length > 0)
    .sort((a, b) => b.score - a.score);

  if (weighted.length === 0) {
    return null;
  }

  const best =
    mentionsCounterpart && weighted.some((entry) => normalizeForSearch(entry.item.content).includes("contrapartida"))
      ? weighted.find((entry) => normalizeForSearch(entry.item.content).includes("contrapartida")) ?? weighted[0]
      : weighted[0];

  const value = best.values[0];
  return `O valor informado no documento e ${value}.`;
};

const parseJsonSafe = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }
};

const parseEmbedding = (raw: string | null | undefined): number[] | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }
    const numeric = parsed.map((item) => Number(item));
    if (numeric.some((item) => Number.isNaN(item))) {
      return null;
    }
    return numeric;
  } catch {
    return null;
  }
};

const cosineSimilarity = (a: number[], b: number[]) => {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] ** 2;
    normB += b[index] ** 2;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getOpenAiClient = () => {
  if (!env.openaiApiKey) {
    return null;
  }
  return new OpenAI({ apiKey: env.openaiApiKey });
};

const getSummaryClient = () => {
  if (!env.aiDocumentSummaryEnabled) {
    return null;
  }
  return getOpenAiClient();
};

const getQaClient = () => {
  if (!env.aiDocumentQaEnabled) {
    return null;
  }
  return getOpenAiClient();
};

const getEmbeddingClient = () => {
  if (!env.aiDocumentSemanticEnabled) {
    return null;
  }
  return getOpenAiClient();
};

const getClassificationClient = () => {
  if (!env.aiDocumentClassificationEnabled) {
    return null;
  }
  return getOpenAiClient();
};

const rankChunksByQuery = (chunks: Array<{ chunkIndex: number; content: string; embedding?: number[] | null }>, query: string) => {
  const terms = splitTerms(query);
  const ranked: RankedChunk[] = [];

  for (const chunk of chunks) {
    const lower = chunk.content.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (lower.includes(term)) {
        const occurrences = lower.split(term).length - 1;
        score += Math.max(1, occurrences);
      }
    }

    if (score > 0) {
      ranked.push({ ...chunk, score });
    }
  }

  if (ranked.length === 0) {
    return chunks.slice(0, 6).map((chunk, index) => ({ ...chunk, score: Math.max(1, 6 - index) }));
  }

  return ranked.sort((a, b) => b.score - a.score).slice(0, 8);
};

const generateSummary = async (titulo: string, text: string) => {
  const client = getSummaryClient();
  if (!client) {
    return { summary: null, keywords: null };
  }

  try {
    const source = text.length > 4500 ? `${text.slice(0, 4500)}\n\n[texto truncado]` : text;
    const response = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 450,
      messages: [
        {
          role: "system",
          content: "Retorne apenas JSON valido, sem markdown, com chaves: resumo e palavras_chave."
        },
        {
          role: "user",
          content: `Analise o documento a seguir e gere resumo executivo em ate 600 caracteres e 8 palavras-chave.\n\nTitulo: ${titulo}\n\nConteudo:\n${source}`
        }
      ]
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      return { summary: null, keywords: null };
    }

    const parsed = parseJsonSafe<{ resumo?: string; palavras_chave?: string[] | string }>(raw);
    if (!parsed) {
      return { summary: null, keywords: null };
    }

    const summary = parsed.resumo ? String(parsed.resumo).trim().slice(0, 1200) : null;
    const keywordsArray = Array.isArray(parsed.palavras_chave)
      ? parsed.palavras_chave.map((item) => String(item).trim()).filter((item) => item.length > 0)
      : typeof parsed.palavras_chave === "string"
        ? parsed.palavras_chave.split(",").map((item) => item.trim()).filter((item) => item.length > 0)
        : [];

    return {
      summary,
      keywords: keywordsArray.length > 0 ? keywordsArray.slice(0, 8).join(", ") : null
    };
  } catch {
    return { summary: null, keywords: null };
  }
};

const classifyDocument = async (titulo: string, text: string): Promise<DocumentClassification> => {
  const client = getClassificationClient();
  if (!client) {
    return classifyDocumentHeuristic(titulo, text);
  }

  try {
    const source = text.length > 5000 ? `${text.slice(0, 5000)}\n\n[texto truncado]` : text;
    const response = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content:
            "Retorne somente JSON valido com: categoria, risco, confianca, insights. Categorias validas: CONTRATO, OFICIO, RELATORIO, PRESTACAO_CONTAS, COMPROVANTE, OUTROS. Risco valido: BAIXO, MEDIO, ALTO, CRITICO."
        },
        {
          role: "user",
          content: `Classifique o documento abaixo para gestao publica de convenios.\n\nTitulo: ${titulo}\n\nConteudo:\n${source}`
        }
      ]
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      return { category: null, riskLevel: null, confidence: null, insights: null };
    }

    const parsed = parseJsonSafe<{ categoria?: string; risco?: string; confianca?: number; insights?: string }>(raw);
    if (!parsed) {
      return { category: null, riskLevel: null, confidence: null, insights: null };
    }

    const categoryRaw = (parsed.categoria ?? "").toString().trim().toUpperCase();
    const riskRaw = (parsed.risco ?? "").toString().trim().toUpperCase();
    const category = Object.values(DocumentAiCategory).includes(categoryRaw as DocumentAiCategory)
      ? (categoryRaw as DocumentAiCategory)
      : null;
    const riskLevel = Object.values(DocumentAiRiskLevel).includes(riskRaw as DocumentAiRiskLevel)
      ? (riskRaw as DocumentAiRiskLevel)
      : null;

    const confidence = Number(parsed.confianca);
    const normalizedConfidence = Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, confidence))
      : null;

    return {
      category,
      riskLevel,
      confidence: normalizedConfidence,
      insights: parsed.insights ? String(parsed.insights).trim().slice(0, 1800) : null
    };
  } catch {
    return classifyDocumentHeuristic(titulo, text);
  }
};

const generateEmbeddingsForChunks = async (chunks: string[]) => {
  const client = getEmbeddingClient();
  if (!client || chunks.length === 0) {
    return null;
  }

  try {
    const response = await client.embeddings.create({
      model: env.openaiEmbeddingModel,
      input: chunks.map((chunk) => (chunk.length > 3000 ? `${chunk.slice(0, 3000)}...` : chunk))
    });
    const vectors = response.data.map((item) => item.embedding);
    if (vectors.length !== chunks.length) {
      return null;
    }
    return vectors;
  } catch {
    return null;
  }
};

const extractTextWithOcrSpace = async (buffer: Buffer) => {
  if (!env.aiDocumentOcrEnabled || !env.ocrSpaceApiKey) {
    return null;
  }

  try {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
    form.append("apikey", env.ocrSpaceApiKey);
    form.append("language", env.ocrSpaceLanguage || "por");
    form.append("isCreateSearchablePdf", "false");
    form.append("isOverlayRequired", "false");
    form.append("file", blob, "document.pdf");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: form
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      IsErroredOnProcessing?: boolean;
      ErrorMessage?: string | string[];
      ParsedResults?: Array<{ ParsedText?: string }>;
    };

    if (payload.IsErroredOnProcessing) {
      return null;
    }

    const text = (payload.ParsedResults ?? [])
      .map((item) => item.ParsedText ?? "")
      .join("\n")
      .trim();

    return text || null;
  } catch {
    return null;
  }
};

const mapDocBase = (doc: {
  id: number;
  titulo: string;
  descricao: string | null;
  arquivoNome: string;
  status: DocumentStatus;
  indexStatus: DocumentIndexStatus;
  aiSummary: string | null;
  aiKeywords: string | null;
  aiCategory: DocumentAiCategory | null;
  aiRiskLevel: DocumentAiRiskLevel | null;
  aiClassificationConfidence: number | null;
  aiInsights: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdByUser: { id: number; nome: string; email: string };
}) => ({
  id: doc.id,
  titulo: doc.titulo,
  descricao: doc.descricao,
  arquivoNome: doc.arquivoNome,
  status: doc.status,
  indexStatus: doc.indexStatus,
  aiSummary: doc.aiSummary,
  aiKeywords: doc.aiKeywords,
  aiCategory: doc.aiCategory,
  aiRiskLevel: doc.aiRiskLevel,
  aiClassificationConfidence: doc.aiClassificationConfidence,
  aiInsights: doc.aiInsights,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
  criado_por: doc.createdByUser
});

const indexDocumentText = async (documentId: number, titulo: string, normalizedText: string) => {
  const chunks = chunkText(normalizedText);
  const ai = await generateSummary(titulo, normalizedText);
  const classification = await classifyDocument(titulo, normalizedText);
  const embeddings = await generateEmbeddingsForChunks(chunks);

  await prisma.$transaction(async (tx) => {
    await tx.documentChunk.deleteMany({ where: { documentId } });

    if (chunks.length > 0) {
      await tx.documentChunk.createMany({
        data: chunks.map((content, index) => ({
          documentId,
          chunkIndex: index,
          content,
          embeddingVector: embeddings ? JSON.stringify(embeddings[index]) : null,
          embeddingModel: embeddings ? env.openaiEmbeddingModel : null
        }))
      });
    }

    await tx.document.update({
      where: { id: documentId },
      data: {
        indexStatus: DocumentIndexStatus.INDEXADO,
        indexedAt: new Date(),
        indexError: null,
        aiSummary: ai.summary,
        aiKeywords: ai.keywords,
        aiCategory: classification.category,
        aiRiskLevel: classification.riskLevel,
        aiClassificationConfidence: classification.confidence,
        aiInsights: classification.insights
      }
    });
  });
};

const runIndexDocument = async (documentId: number) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, titulo: true, arquivoPath: true }
  });

  if (!document) {
    return;
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      indexStatus: DocumentIndexStatus.PROCESSANDO,
      indexError: null
    }
  });

  try {
    if (!fs.existsSync(document.arquivoPath)) {
      throw new Error("Arquivo do documento nao encontrado no servidor.");
    }

    const buffer = fs.readFileSync(document.arquivoPath);
    const extractedText = await extractTextFromPdf(buffer);
    let normalized = normalizeText(extractedText);

    if (!normalized) {
      const ocrText = await extractTextWithOcrSpace(buffer);
      normalized = normalizeText(ocrText ?? "");
    }

    if (!normalized) {
      throw new Error("Nao foi possivel extrair texto do PDF. Para escaneados, habilite OCR e reindexe.");
    }

    await indexDocumentText(documentId, document.titulo, normalized);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao indexar documento.";
    await prisma.document.update({
      where: { id: documentId },
      data: {
        indexStatus: DocumentIndexStatus.ERRO,
        indexedAt: null,
        indexError: message
      }
    });
  }
};

const buildWhereDoc = (filters: Omit<DocumentSearchFilters, "q">) => {
  const whereDoc: any = {};

  if (filters.status) {
    whereDoc.status = filters.status;
  }
  if (filters.createdByUserId) {
    whereDoc.createdByUserId = filters.createdByUserId;
  }

  if (filters.dataDe || filters.dataAte) {
    whereDoc.createdAt = {};
    if (filters.dataDe) {
      whereDoc.createdAt.gte = new Date(`${filters.dataDe}T00:00:00.000Z`);
    }
    if (filters.dataAte) {
      whereDoc.createdAt.lte = new Date(`${filters.dataAte}T23:59:59.999Z`);
    }
  }

  return whereDoc;
};

export const queueDocumentIndexation = (documentId: number) => {
  setTimeout(() => {
    void runIndexDocument(documentId);
  }, 0);
};

export const reindexDocument = async (documentId: number) => {
  const exists = await prisma.document.findUnique({ where: { id: documentId }, select: { id: true } });
  if (!exists) {
    return false;
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      indexStatus: DocumentIndexStatus.PENDENTE,
      indexError: null
    }
  });

  queueDocumentIndexation(documentId);
  return true;
};

export const getDocumentIndexStatus = async (documentId: number) => {
  return prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      indexStatus: true,
      indexedAt: true,
      indexError: true,
      aiSummary: true,
      aiKeywords: true,
      aiCategory: true,
      aiRiskLevel: true,
      aiClassificationConfidence: true,
      aiInsights: true
    }
  });
};

export const classifyDocumentById = async (documentId: number) => {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      titulo: true,
      chunks: {
        select: { content: true },
        orderBy: { chunkIndex: "asc" },
        take: 30
      }
    }
  });

  if (!doc) {
    return false;
  }

  if (doc.chunks.length === 0) {
    throw new Error("Documento sem chunks indexados. Reindexe antes de classificar.");
  }

  const text = doc.chunks.map((item) => item.content).join("\n");
  const classification = await classifyDocument(doc.titulo, text);

  await prisma.document.update({
    where: { id: documentId },
    data: {
      aiCategory: classification.category,
      aiRiskLevel: classification.riskLevel,
      aiClassificationConfidence: classification.confidence,
      aiInsights: classification.insights
    }
  });

  return true;
};

export const searchDocumentContent = async (filters: DocumentSearchFilters) => {
  const q = filters.q.trim();
  if (!q) {
    return [];
  }

  const terms = splitTerms(q);

  const limit = Math.min(Math.max(filters.limit ?? 30, 1), 100);
  const whereDoc = buildWhereDoc(filters);

  const contentFilters: Array<{ content: { contains: string } }> = [];
  contentFilters.push({ content: { contains: q } });
  for (const term of terms) {
    contentFilters.push({ content: { contains: term } });
  }

  const chunkMatches = await prisma.documentChunk.findMany({
    where: {
      OR: contentFilters,
      document: whereDoc
    },
    include: {
      document: {
        include: {
          createdByUser: { select: { id: true, nome: true, email: true } }
        }
      }
    },
    take: Math.min(limit * 4, 220),
    orderBy: { id: "desc" }
  });

  const grouped = new Map<number, {
    doc: (typeof chunkMatches)[number]["document"];
    score: number;
    snippet: string;
    matchedChunks: number;
  }>();

  for (const chunk of chunkMatches) {
    const existing = grouped.get(chunk.documentId);
    const qLower = q.toLowerCase();
    const contentLower = chunk.content.toLowerCase();
    const occurrences = contentLower.split(qLower).length - 1;
    const titleBonus = chunk.document.titulo.toLowerCase().includes(qLower) ? 5 : 0;
    const score = occurrences * 2 + titleBonus + 1;

    if (!existing) {
      grouped.set(chunk.documentId, {
        doc: chunk.document,
        score,
        snippet: getSnippet(chunk.content, q),
        matchedChunks: 1
      });
      continue;
    }

    existing.score += score;
    existing.matchedChunks += 1;
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({
      ...mapDocBase(item.doc),
      matched_chunks: item.matchedChunks,
      score: item.score,
      snippet: item.snippet,
      searchType: "lexical"
    }));
};

export const searchDocumentContentSemantic = async (filters: DocumentSearchFilters) => {
  const q = filters.q.trim();
  if (!q) {
    return [];
  }

  const embeddingClient = getEmbeddingClient();
  if (!embeddingClient) {
    return searchDocumentContent(filters);
  }

  let queryVector: number[] | null = null;
  try {
    const response = await embeddingClient.embeddings.create({
      model: env.openaiEmbeddingModel,
      input: q
    });
    queryVector = response.data[0]?.embedding ?? null;
  } catch {
    queryVector = null;
  }

  if (!queryVector) {
    return searchDocumentContent(filters);
  }

  try {
    const limit = Math.min(Math.max(filters.limit ?? 30, 1), 100);
    const whereDoc = buildWhereDoc(filters);

    const chunks = await prisma.documentChunk.findMany({
      where: {
        embeddingVector: { not: null },
        document: whereDoc
      },
      include: {
        document: {
          include: {
            createdByUser: { select: { id: true, nome: true, email: true } }
          }
        }
      },
      take: 2400,
      orderBy: { id: "desc" }
    });

    const grouped = new Map<number, {
      doc: (typeof chunks)[number]["document"];
      score: number;
      bestChunk: string;
      matchedChunks: number;
    }>();

    for (const chunk of chunks) {
      const chunkVector = parseEmbedding(chunk.embeddingVector);
      if (!chunkVector) {
        continue;
      }

      const semanticScore = cosineSimilarity(queryVector, chunkVector);
      if (semanticScore < 0.2) {
        continue;
      }

      const lexicalBoost = chunk.content.toLowerCase().includes(q.toLowerCase()) ? 0.08 : 0;
      const finalScore = semanticScore + lexicalBoost;
      const existing = grouped.get(chunk.documentId);

      if (!existing) {
        grouped.set(chunk.documentId, {
          doc: chunk.document,
          score: finalScore,
          bestChunk: chunk.content,
          matchedChunks: 1
        });
        continue;
      }

      existing.matchedChunks += 1;
      existing.score = Math.max(existing.score, finalScore);
      if (finalScore >= existing.score) {
        existing.bestChunk = chunk.content;
      }
    }

    return Array.from(grouped.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => ({
        ...mapDocBase(item.doc),
        matched_chunks: item.matchedChunks,
        score: Number((item.score * 100).toFixed(2)),
        snippet: getSnippet(item.bestChunk, q),
        searchType: "semantic"
      }));
  } catch {
    return searchDocumentContent(filters);
  }
};

export const injectOcrTextForDocument = async (documentId: number, texto: string) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, titulo: true }
  });

  if (!document) {
    return false;
  }

  const normalized = normalizeText(texto);
  if (!normalized) {
    throw new Error("Texto OCR vazio.");
  }

  await indexDocumentText(documentId, document.titulo, normalized);
  return true;
};

export const answerDocumentQuestion = async (documentId: number, question: string) => {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      titulo: true,
      aiSummary: true,
      chunks: {
        select: { chunkIndex: true, content: true, embeddingVector: true },
        orderBy: { chunkIndex: "asc" },
        take: 280
      }
    }
  });

  if (!doc) {
    throw new Error("Documento nao encontrado.");
  }
  if (doc.chunks.length === 0) {
    throw new Error("Documento ainda nao indexado. Reindexe ou envie texto OCR.");
  }

  const queryVector = await (async () => {
    const client = getEmbeddingClient();
    if (!client) {
      return null;
    }
    try {
      const response = await client.embeddings.create({
        model: env.openaiEmbeddingModel,
        input: question
      });
      return response.data[0]?.embedding ?? null;
    } catch {
      return null;
    }
  })();

  const lexicalRank = rankChunksByQuery(
    doc.chunks.map((item) => ({
      chunkIndex: item.chunkIndex,
      content: item.content,
      embedding: parseEmbedding(item.embeddingVector)
    })),
    question
  );

  const semanticRank =
    queryVector === null
      ? []
      : doc.chunks
          .map((item) => {
            const embedding = parseEmbedding(item.embeddingVector);
            const semanticScore = embedding ? cosineSimilarity(queryVector, embedding) : 0;
            return {
              chunkIndex: item.chunkIndex,
              content: item.content,
              score: semanticScore
            };
          })
          .filter((item) => item.score > 0.18)
          .sort((a, b) => b.score - a.score)
          .slice(0, 8);

  const merged = new Map<number, RankedChunk>();
  for (const item of lexicalRank) {
    merged.set(item.chunkIndex, item);
  }
  for (const item of semanticRank) {
    const exists = merged.get(item.chunkIndex);
    if (!exists || item.score > exists.score) {
      merged.set(item.chunkIndex, item);
    }
  }

  const ranked = Array.from(merged.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const context = ranked.map((item) => `[trecho ${item.chunkIndex}] ${item.content}`).join("\n\n");

  const client = getQaClient();
  if (!client) {
    const heuristic = buildHeuristicAnswer(question, ranked, doc.chunks.map((item) => ({
      chunkIndex: item.chunkIndex,
      content: item.content,
      score: 0,
      embedding: parseEmbedding(item.embeddingVector)
    })));
    if (heuristic) {
      return {
        resposta: heuristic,
        fontes: ranked.slice(0, 5).map((item) => ({
          chunkIndex: item.chunkIndex,
          score: Number((item.score * 100).toFixed(2)),
          snippet: getSnippet(item.content, question)
        }))
      };
    }

    return {
      resposta: `Nao foi possivel usar IA para responder agora. Trechos relevantes:\n\n${ranked
        .slice(0, 3)
        .map((item) => `- ${getSnippet(item.content, question)}`)
        .join("\n")}`,
      fontes: ranked.slice(0, 5).map((item) => ({
        chunkIndex: item.chunkIndex,
        score: Number((item.score * 100).toFixed(2)),
        snippet: getSnippet(item.content, question)
      }))
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.1,
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "Voce responde perguntas sobre documentos juridicos/administrativos. Use apenas o contexto fornecido. Se nao houver base, diga claramente. Retorne JSON valido com as chaves resposta e citacoes (array de numeros dos trechos)."
        },
        {
          role: "user",
          content: `Documento: ${doc.titulo}\nResumo IA: ${doc.aiSummary ?? "(sem resumo)"}\n\nPergunta: ${question}\n\nContexto:\n${context}`
        }
      ]
    });

    const raw = response.choices[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error("Resposta vazia da IA.");
    }

    const parsed = parseJsonSafe<{ resposta?: string; citacoes?: number[] }>(raw);
    if (!parsed) {
      throw new Error("Falha ao interpretar resposta da IA.");
    }

    const citacoes = Array.isArray(parsed.citacoes)
      ? parsed.citacoes.filter((value) => Number.isInteger(value)).map((value) => Number(value))
      : [];

    const selectedSources = ranked
      .filter((item) => (citacoes.length === 0 ? true : citacoes.includes(item.chunkIndex)))
      .slice(0, 6)
      .map((item) => ({
        chunkIndex: item.chunkIndex,
        score: Number((item.score * 100).toFixed(2)),
        snippet: getSnippet(item.content, question)
      }));

    return {
      resposta: (parsed.resposta ?? "Nao foi possivel gerar resposta com base no contexto.").trim(),
      fontes: selectedSources
    };
  } catch {
    const heuristic = buildHeuristicAnswer(question, ranked, doc.chunks.map((item) => ({
      chunkIndex: item.chunkIndex,
      content: item.content,
      score: 0,
      embedding: parseEmbedding(item.embeddingVector)
    })));
    if (heuristic) {
      return {
        resposta: heuristic,
        fontes: ranked.slice(0, 5).map((item) => ({
          chunkIndex: item.chunkIndex,
          score: Number((item.score * 100).toFixed(2)),
          snippet: getSnippet(item.content, question)
        }))
      };
    }

    return {
      resposta: `Nao foi possivel gerar resposta estruturada da IA. Trechos recomendados:\n\n${ranked
        .slice(0, 3)
        .map((item) => `- ${getSnippet(item.content, question)}`)
        .join("\n")}`,
      fontes: ranked.slice(0, 5).map((item) => ({
        chunkIndex: item.chunkIndex,
        score: Number((item.score * 100).toFixed(2)),
        snippet: getSnippet(item.content, question)
      }))
    };
  }
};
