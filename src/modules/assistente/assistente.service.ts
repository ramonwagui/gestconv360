import { InstrumentFlowType } from "@prisma/client";
import OpenAI from "openai";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import type { AssistentePerguntaInput } from "./assistente.schema";

type AssistenteIntencao =
  | "desembolso_cidade"
  | "convenios_cidade"
  | "percentual_obra"
  | "tickets_atrasados_sem_responsavel"
  | "vigencias_instrumentos"
  | "ranking_cidades_desembolso"
  | "nao_entendida";
type AssistenteConfianca = "alta" | "media" | "baixa";

type AssistenteResposta = {
  pergunta: string;
  intencao: AssistenteIntencao;
  confianca: AssistenteConfianca;
  resposta: string;
  dados?: Record<string, unknown>;
  sugestoes: string[];
  contexto_usado?: boolean;
  pergunta_interpretada?: string;
};

const SUGESTOES_PADRAO = [
  "Qual valor de desembolso ja foi feito para a cidade de Parnamirim?",
  "Em quantos por cento esta a obra 123?",
  "Quais tickets estao atrasados e sem responsavel?",
  "Quais instrumentos ja venceram ou vencem em 30 dias?",
  "Mostre o ranking de cidades por desembolso"
];

const ASSISTENTE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "get_convenios_por_cidade",
      description: "Retorna quantidade de convenios/instrumentos cadastrados para uma cidade.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Nome da cidade alvo da consulta." },
          status: {
            type: "string",
            enum: ["EM_EXECUCAO", "CONCLUIDO", "VENCIDO", "EM_ELABORACAO"],
            description: "Status opcional para filtrar os instrumentos da cidade."
          }
        },
        required: ["cidade"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_desembolso_por_cidade",
      description: "Retorna o desembolso consolidado para uma cidade.",
      parameters: {
        type: "object",
        properties: {
          cidade: { type: "string", description: "Nome da cidade alvo da consulta." }
        },
        required: ["cidade"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_percentual_obra",
      description: "Retorna percentual de execucao de uma obra por id, proposta ou instrumento.",
      parameters: {
        type: "object",
        properties: {
          referencia: { type: "string", description: "ID da obra, numero da proposta ou instrumento." }
        },
        required: ["referencia"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_tickets_atrasados_sem_responsavel",
      description: "Retorna total e amostra de tickets atrasados e sem responsavel.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_vigencias_instrumentos",
      description: "Retorna instrumentos vencidos ou a vencer em janela de dias.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["vencidas", "a_vencer"] },
          dias: { type: "number", description: "Janela em dias quando status for a_vencer." }
        },
        required: ["status"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_ranking_cidades_desembolso",
      description: "Retorna ranking das cidades por desembolso consolidado.",
      parameters: {
        type: "object",
        properties: {
          top: { type: "number", description: "Quantidade maxima de cidades no ranking." }
        },
        required: []
      }
    }
  }
];

const getOpenAIClient = () => {
  if (!env.openaiApiKey) {
    return null;
  }
  return new OpenAI({ apiKey: env.openaiApiKey });
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

const toNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const hasAnyTerm = (source: string, terms: string[]) => terms.some((term) => source.includes(term));

const extractTopN = (question: string, fallback = 5) => {
  const normalized = normalizeText(question);
  const directTop = normalized.match(/top\s*(\d{1,2})/);
  if (directTop?.[1]) {
    return Math.max(1, Math.min(20, Number(directTop[1])));
  }

  const maiores = normalized.match(/(\d{1,2})\s*(?:maiores|principais|primeiras|primeiros)/);
  if (maiores?.[1]) {
    return Math.max(1, Math.min(20, Number(maiores[1])));
  }

  return fallback;
};

const safeParseJson = <T>(raw: string | undefined): T | null => {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      return null;
    }
  }
};

type AssistenteHistoricoItem = {
  role: "user" | "assistant";
  text: string;
};

const resolveQuestionWithRules = (pergunta: string, historico: AssistenteHistoricoItem[]) => {
  const trimmed = pergunta.trim();
  if (historico.length === 0) {
    return trimmed;
  }

  const normalized = normalizeText(trimmed);
  const isFollowUp = /^(e\s|e\b|entao\b|e\s+quant|e\s+quais)/i.test(normalized);
  const hasOwnCity = extractCityFromQuestion(trimmed) !== null;
  if (!isFollowUp || hasOwnCity) {
    return trimmed;
  }

  const lastUserWithCity = [...historico]
    .reverse()
    .find((item) => item.role === "user" && extractCityFromQuestion(item.text));
  const city = lastUserWithCity ? extractCityFromQuestion(lastUserWithCity.text) : null;

  if (!city) {
    return trimmed;
  }

  if (hasAnyTerm(normalized, ["execucao", "em execucao"])) {
    return `Quantos convenios da cidade de ${city} estao em execucao?`;
  }

  if (hasAnyTerm(normalized, ["ativo", "ativos"])) {
    return `Quantos convenios da cidade de ${city} estao ativos?`;
  }

  if (hasAnyTerm(normalized, ["quantos", "quantidade", "total"])) {
    return `Quantos convenios a cidade de ${city} tem hoje?`;
  }

  return `Sobre a cidade de ${city}, ${trimmed}`;
};

const resolveQuestionWithAI = async (
  client: OpenAI,
  pergunta: string,
  historico: AssistenteHistoricoItem[]
): Promise<string> => {
  if (historico.length === 0) {
    return pergunta.trim();
  }

  try {
    const historyWindow = historico.slice(-10).map((item) => ({ role: item.role, text: item.text }));
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "Reescreva a pergunta do usuario para uma forma completa, preservando intencao e usando o historico recente somente quando houver referencias implicitas (ex.: 'e quantos desses...'). Retorne APENAS JSON valido no formato {\"pergunta_completa\":\"...\"}."
        },
        {
          role: "user",
          content: JSON.stringify({ pergunta_atual: pergunta, historico: historyWindow })
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    const parsed = safeParseJson<{ pergunta_completa?: string }>(raw);
    const full = parsed?.pergunta_completa?.trim();
    if (full && full.length >= 3) {
      return full;
    }
  } catch {
    // fallback para regra local
  }

  return resolveQuestionWithRules(pergunta, historico);
};

const isDesembolsoQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasValueTerm = hasAnyTerm(normalized, ["desembolso", "repass", "valor", "pago"]);
  const hasLocationTerm = hasAnyTerm(normalized, ["cidade", "municipio"]);
  const hasRankingTerm = hasAnyTerm(normalized, ["ranking", "top", "maiores", "principais"]);
  if (hasRankingTerm) {
    return false;
  }
  return hasValueTerm && hasLocationTerm;
};

const isConveniosCidadeQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasConvenioTerm = hasAnyTerm(normalized, ["convenio", "convenios", "instrumento", "instrumentos", "proposta", "propostas"]);
  const hasCountTerm = hasAnyTerm(normalized, ["quantos", "quantidade", "total", "tem", "existem", "ha"]);
  const hasLocationTerm = hasAnyTerm(normalized, ["cidade", "municipio"]);
  return hasConvenioTerm && hasCountTerm && hasLocationTerm;
};

const isPercentualObraQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasPercentTerm = hasAnyTerm(normalized, ["por cento", "percentual", "%", "execucao", "andamento"]);
  const hasWorkTerm = hasAnyTerm(normalized, ["obra", "proposta", "instrumento"]);
  return hasPercentTerm && hasWorkTerm;
};

const isTicketsAtrasadosSemResponsavelQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasTicketTerm = hasAnyTerm(normalized, ["ticket", "tickets"]);
  const hasOverdueTerm = hasAnyTerm(normalized, ["atrasad", "vencid", "prazo"]);
  const hasOwnerTerm = hasAnyTerm(normalized, ["sem responsavel", "nao atribuido", "sem atribuicao", "sem atribuicao"]);
  return hasTicketTerm && hasOverdueTerm && hasOwnerTerm;
};

const isVigenciaQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasVigenciaTerm = hasAnyTerm(normalized, ["vigencia", "venc", "expira", "expirar"]);
  const hasInstrumentTerm = hasAnyTerm(normalized, ["instrumento", "proposta", "obra", "convenio"]);
  return hasVigenciaTerm && hasInstrumentTerm;
};

const isRankingCidadesDesembolsoQuestion = (question: string) => {
  const normalized = normalizeText(question);
  const hasLocationPlural = hasAnyTerm(normalized, ["cidades", "municipios"]);
  const hasValueTerm = hasAnyTerm(normalized, ["desembolso", "repass", "valor pago", "valor"]);
  const hasRankingTerm = hasAnyTerm(normalized, ["ranking", "top", "maiores", "principais", "ordem"]);
  return hasLocationPlural && hasValueTerm && hasRankingTerm;
};

const extractInstrumentStatusFromQuestion = (question: string) => {
  const normalized = normalizeText(question);
  if (hasAnyTerm(normalized, ["em execucao", "execucao"])) {
    return "EM_EXECUCAO" as const;
  }
  if (hasAnyTerm(normalized, ["concluido", "concluidos", "concluidas"])) {
    return "CONCLUIDO" as const;
  }
  if (hasAnyTerm(normalized, ["vencido", "vencidos", "vencida", "vencidas"])) {
    return "VENCIDO" as const;
  }
  if (hasAnyTerm(normalized, ["em elaboracao", "elaboracao"])) {
    return "EM_ELABORACAO" as const;
  }
  return null;
};

const extractVigenciaDaysWindow = (question: string) => {
  const normalized = normalizeText(question);
  const explicit = normalized.match(/\b(30|60|90|120|180)\b/);
  if (explicit?.[1]) {
    return Number(explicit[1]);
  }
  if (hasAnyTerm(normalized, ["proxim", "vencer", "vence", "a vencer"])) {
    return 30;
  }
  return null;
};

const extractCityFromQuestion = (question: string) => {
  const patterns = [
    /(?:cidade|municipio)\s+de\s+([A-Za-zÀ-ÿ\s'`-]{3,50})/i,
    /(?:para|em)\s+(?:a\s+)?cidade\s+de\s+([A-Za-zÀ-ÿ\s'`-]{3,50})/i,
    /(?:para|em)\s+(?:o\s+)?municipio\s+de\s+([A-Za-zÀ-ÿ\s'`-]{3,50})/i,
    /(?:cidade|municipio)\s+([A-Za-zÀ-ÿ\s'`-]{3,50})/i
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (!match?.[1]) {
      continue;
    }

    const cleaned = match[1]
      .split(/[?.,;:!]/)[0]
      .replace(/\b(hoje|atual|atualmente|ja|até|ate|nos|nas|dos|das|com|tem|existem|ha|agora|pe|rn|sp|rj|mg|ba|ce|go|es|df|pr|sc|rs|mt|ms|to|pa|am|ac|al|ap|ma|pb|pi|ro|rr|se)\b.*$/i, "")
      .trim();
    if (cleaned.length >= 3) {
      return cleaned;
    }
  }

  return null;
};

const responderConveniosPorCidade = async (pergunta: string): Promise<AssistenteResposta> => {
  const cidadeInformada = extractCityFromQuestion(pergunta);
  if (!cidadeInformada) {
    return {
      pergunta,
      intencao: "convenios_cidade",
      confianca: "baixa",
      resposta: "Para contar os convenios, informe a cidade. Exemplo: quantos convenios a cidade de Parnamirim tem hoje?",
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const cidadeNormalized = normalizeText(cidadeInformada);
  let convenetes = await prisma.convenete.findMany({
    where: {
      OR: [{ cidade: { contains: cidadeInformada } }, { cidade: { contains: cidadeInformada.toUpperCase() } }]
    },
    select: { id: true, cidade: true, uf: true }
  });

  if (convenetes.length === 0) {
    const allConvenetes = await prisma.convenete.findMany({ select: { id: true, cidade: true, uf: true } });
    convenetes = allConvenetes.filter((item) => {
      const city = normalizeText(item.cidade);
      return city.includes(cidadeNormalized) || cidadeNormalized.includes(city);
    });
  }

  if (convenetes.length === 0) {
    return {
      pergunta,
      intencao: "convenios_cidade",
      confianca: "media",
      resposta: `Nao encontrei cidade/proponente cadastrada para '${cidadeInformada}'.`,
      dados: { cidade: cidadeInformada, instrumentos_ativos: 0, instrumentos_total: 0 },
      sugestoes: []
    };
  }

  const conveneteIds = convenetes.map((item) => item.id);
  const statusFilter = extractInstrumentStatusFromQuestion(pergunta);
  const [ativos, total] = await Promise.all([
    prisma.instrumentProposal.count({ where: { conveneteId: { in: conveneteIds }, ativo: true } }),
    prisma.instrumentProposal.count({ where: { conveneteId: { in: conveneteIds } } })
  ]);

  const totalByStatus = statusFilter
    ? await prisma.instrumentProposal.count({
        where: {
          conveneteId: { in: conveneteIds },
          ativo: true,
          status: statusFilter
        }
      })
    : null;

  const cidadeBase = convenetes[0];
  const statusLabel =
    statusFilter === "EM_EXECUCAO"
      ? "em execucao"
      : statusFilter === "CONCLUIDO"
        ? "concluidos"
        : statusFilter === "VENCIDO"
          ? "vencidos"
          : statusFilter === "EM_ELABORACAO"
            ? "em elaboracao"
            : null;

  return {
    pergunta,
    intencao: "convenios_cidade",
    confianca: "alta",
    resposta:
      statusLabel && totalByStatus !== null
        ? `${cidadeBase.cidade}/${cidadeBase.uf} tem ${totalByStatus} convenio(s)/instrumento(s) ${statusLabel}.`
        : ativos === total
          ? `${cidadeBase.cidade}/${cidadeBase.uf} tem ${ativos} convenio(s)/instrumento(s) cadastrado(s).`
          : `${cidadeBase.cidade}/${cidadeBase.uf} tem ${ativos} convenio(s)/instrumento(s) ativo(s) de ${total} cadastrado(s) no total.`,
    dados: {
      cidade: cidadeBase.cidade,
      uf: cidadeBase.uf,
      proponentes_encontrados: convenetes.length,
      status_filtrado: statusFilter,
      instrumentos_status_filtrado: totalByStatus,
      instrumentos_ativos: ativos,
      instrumentos_total: total
    },
    sugestoes: []
  };
};

const extractObraReference = (question: string) => {
  const obraIdMatch = question.match(/obra\s*(?:id|n(?:o|u?mero)?|#)?\s*(\d{1,10})/i);
  if (obraIdMatch?.[1]) {
    return { tipo: "id" as const, valor: obraIdMatch[1] };
  }

  const propostaMatch = question.match(/proposta\s*(?:n(?:o|u?mero)?|#)?\s*([A-Za-z0-9./-]{3,40})/i);
  if (propostaMatch?.[1]) {
    return { tipo: "proposta" as const, valor: propostaMatch[1] };
  }

  const instrumentoMatch = question.match(/instrumento\s*(?:n(?:o|u?mero)?|#)?\s*([A-Za-z0-9./-]{3,40})/i);
  if (instrumentoMatch?.[1]) {
    return { tipo: "instrumento" as const, valor: instrumentoMatch[1] };
  }

  const genericNumeric = question.match(/\b(\d{4,10})\b/);
  if (genericNumeric?.[1]) {
    return { tipo: "id" as const, valor: genericNumeric[1] };
  }

  return null;
};

const buildFallbackResponse = (pergunta: string): AssistenteResposta => ({
  pergunta,
  intencao: "nao_entendida",
  confianca: "baixa",
  resposta:
    "Ainda nao entendi essa pergunta com seguranca. Posso responder sobre desembolso por cidade, percentual de execucao de obra, tickets atrasados sem responsavel, vigencias e ranking de cidades por desembolso.",
  sugestoes: SUGESTOES_PADRAO
});

const responderDesembolsoPorCidade = async (pergunta: string): Promise<AssistenteResposta> => {
  const cidadeInformada = extractCityFromQuestion(pergunta);
  if (!cidadeInformada) {
    return {
      pergunta,
      intencao: "desembolso_cidade",
      confianca: "baixa",
      resposta: "Para calcular o desembolso, informe a cidade. Exemplo: 'qual desembolso ja foi feito para a cidade de Parnamirim?'.",
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const cidadeNormalized = normalizeText(cidadeInformada);

  let convenetes = await prisma.convenete.findMany({
    where: {
      OR: [{ cidade: { contains: cidadeInformada } }, { cidade: { contains: cidadeInformada.toUpperCase() } }]
    },
    select: {
      id: true,
      nome: true,
      cidade: true,
      uf: true
    }
  });

  if (convenetes.length === 0) {
    const allConvenetes = await prisma.convenete.findMany({
      select: {
        id: true,
        nome: true,
        cidade: true,
        uf: true
      }
    });

    convenetes = allConvenetes.filter((item) => {
      const city = normalizeText(item.cidade);
      return city.includes(cidadeNormalized) || cidadeNormalized.includes(city);
    });
  }

  if (convenetes.length === 0) {
    return {
      pergunta,
      intencao: "desembolso_cidade",
      confianca: "media",
      resposta: `Nao encontrei proponentes cadastrados para '${cidadeInformada}'.`,
      dados: {
        cidade: cidadeInformada,
        instrumentos: 0,
        valor_desembolso: 0
      },
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const conveneteIds = convenetes.map((item) => item.id);
  const instruments = await prisma.instrumentProposal.findMany({
    where: {
      conveneteId: { in: conveneteIds },
      ativo: true
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      valorJaRepassado: true,
      repasses: {
        select: {
          valorRepasse: true
        }
      }
    }
  });

  const totalLancadoRepasses = instruments.reduce(
    (acc, item) => acc + item.repasses.reduce((sum, repasse) => sum + toNumber(repasse.valorRepasse), 0),
    0
  );
  const totalCampoInstrumento = instruments.reduce((acc, item) => acc + toNumber(item.valorJaRepassado), 0);
  const totalDesembolso = totalLancadoRepasses > 0 ? totalLancadoRepasses : totalCampoInstrumento;
  const totalRepasses = instruments.reduce((acc, item) => acc + item.repasses.length, 0);

  const cidadeBase = convenetes[0];
  const cidadeLabel = `${cidadeBase.cidade}/${cidadeBase.uf}`;

  return {
    pergunta,
    intencao: "desembolso_cidade",
    confianca: instruments.length > 0 ? "alta" : "media",
    resposta:
      instruments.length === 0
        ? `Encontrei proponentes em ${cidadeLabel}, mas ainda sem instrumentos ativos com desembolso registrado.`
        : `O desembolso consolidado para ${cidadeLabel} e de ${formatCurrency(totalDesembolso)} em ${instruments.length} instrumento(s) ativo(s).`,
    dados: {
      cidade: cidadeBase.cidade,
      uf: cidadeBase.uf,
      proponentes_encontrados: convenetes.length,
      instrumentos: instruments.length,
      repasses_lancados: totalRepasses,
      valor_desembolso: Number(totalDesembolso.toFixed(2))
    },
    sugestoes: [
      `Qual percentual de execucao da obra ${instruments[0]?.id ?? "123"}?`,
      `Quais instrumentos ativos existem em ${cidadeBase.cidade}?`,
      "Me mostre o valor total de repasse por cidade"
    ]
  };
};

const resolvePercentualObra = (item: {
  workProgress: { percentualObra: unknown; updatedAt: Date } | null;
  measurementBulletins: Array<{ percentualObraInformado: unknown | null; dataBoletim: Date }>;
}) => {
  if (item.workProgress) {
    return {
      percentual: toNumber(item.workProgress.percentualObra),
      fonte: "acompanhamento_obra",
      atualizadoEm: item.workProgress.updatedAt.toISOString()
    };
  }

  const lastBulletin = item.measurementBulletins[0];
  if (lastBulletin?.percentualObraInformado != null) {
    return {
      percentual: toNumber(lastBulletin.percentualObraInformado),
      fonte: "boletim_medicao",
      atualizadoEm: lastBulletin.dataBoletim.toISOString()
    };
  }

  return null;
};

const responderPercentualObra = async (pergunta: string): Promise<AssistenteResposta> => {
  const reference = extractObraReference(pergunta);
  const cidadeInformada = extractCityFromQuestion(pergunta);

  const obras = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true,
      fluxoTipo: InstrumentFlowType.OBRA
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      objeto: true,
      status: true,
      convenete: {
        select: {
          cidade: true,
          uf: true,
          nome: true
        }
      },
      workProgress: {
        select: {
          percentualObra: true,
          updatedAt: true
        }
      },
      measurementBulletins: {
        orderBy: [{ dataBoletim: "desc" }],
        take: 1,
        select: {
          percentualObraInformado: true,
          dataBoletim: true
        }
      }
    }
  });

  let selected = null as (typeof obras)[number] | null;

  if (reference) {
    const referenceNormalized = normalizeText(reference.valor);

    if (reference.tipo === "id") {
      const idNumber = Number(reference.valor);
      selected = obras.find((item) => item.id === idNumber) ?? null;
    }

    if (!selected && reference.tipo === "proposta") {
      selected =
        obras.find((item) => normalizeText(item.proposta) === referenceNormalized) ??
        obras.find((item) => normalizeText(item.proposta).includes(referenceNormalized)) ??
        null;
    }

    if (!selected && reference.tipo === "instrumento") {
      selected =
        obras.find((item) => normalizeText(item.instrumento) === referenceNormalized) ??
        obras.find((item) => normalizeText(item.instrumento).includes(referenceNormalized)) ??
        null;
    }
  }

  if (!selected && cidadeInformada) {
    const cityNormalized = normalizeText(cidadeInformada);
    const obrasCidade = obras.filter((item) => {
      const city = normalizeText(item.convenete?.cidade ?? "");
      return city.includes(cityNormalized) || cityNormalized.includes(city);
    });

    const percentuais = obrasCidade
      .map((item) => ({ item, percentual: resolvePercentualObra(item) }))
      .filter((entry) => entry.percentual !== null) as Array<{ item: (typeof obras)[number]; percentual: NonNullable<ReturnType<typeof resolvePercentualObra>> }>;

    if (percentuais.length === 0) {
      return {
        pergunta,
        intencao: "percentual_obra",
        confianca: "media",
        resposta: `Encontrei obras em ${cidadeInformada}, mas sem percentual de execucao registrado ate agora.`,
        sugestoes: SUGESTOES_PADRAO
      };
    }

    const media = percentuais.reduce((acc, entry) => acc + entry.percentual.percentual, 0) / percentuais.length;
    return {
      pergunta,
      intencao: "percentual_obra",
      confianca: "media",
      resposta: `A media de execucao das obras em ${cidadeInformada} esta em ${media.toFixed(2)}%.`,
      dados: {
        cidade: cidadeInformada,
        obras_com_percentual: percentuais.length,
        percentual_medio: Number(media.toFixed(2)),
        exemplo_obra_id: percentuais[0].item.id,
        exemplo_obra_instrumento: percentuais[0].item.instrumento
      },
      sugestoes: [
        `Qual percentual da obra ${percentuais[0].item.id}?`,
        `Qual percentual da proposta ${percentuais[0].item.proposta}?`,
        "Quais obras estao acima de 80%?"
      ]
    };
  }

  if (!selected) {
    return {
      pergunta,
      intencao: "percentual_obra",
      confianca: "baixa",
      resposta: "Nao consegui identificar qual obra voce quer consultar. Informe o ID da obra, numero da proposta ou numero do instrumento.",
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const percentual = resolvePercentualObra(selected);
  if (!percentual) {
    return {
      pergunta,
      intencao: "percentual_obra",
      confianca: "media",
      resposta: `A obra ${selected.id} foi encontrada, mas ainda nao ha percentual de execucao cadastrado.`,
      dados: {
        obra_id: selected.id,
        proposta: selected.proposta,
        instrumento: selected.instrumento,
        status: selected.status
      },
      sugestoes: SUGESTOES_PADRAO
    };
  }

  return {
    pergunta,
    intencao: "percentual_obra",
    confianca: "alta",
    resposta: `A obra ${selected.id} esta com ${percentual.percentual.toFixed(2)}% de execucao.`,
    dados: {
      obra_id: selected.id,
      proposta: selected.proposta,
      instrumento: selected.instrumento,
      status: selected.status,
      cidade: selected.convenete?.cidade ?? null,
      uf: selected.convenete?.uf ?? null,
      percentual_execucao: Number(percentual.percentual.toFixed(2)),
      fonte_percentual: percentual.fonte,
      atualizado_em: percentual.atualizadoEm
    },
    sugestoes: [
      "Qual o desembolso da cidade dessa obra?",
      `Qual percentual da proposta ${selected.proposta}?`,
      "Quais obras estao proximas de concluir?"
    ]
  };
};

const startOfToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
};

const diffDays = (from: Date, to: Date) => {
  const fromDate = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0);
  const toDate = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 0, 0, 0, 0);
  return Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
};

const responderTicketsAtrasadosSemResponsavel = async (pergunta: string): Promise<AssistenteResposta> => {
  const today = startOfToday();

  const items = await prisma.ticket.findMany({
    where: {
      status: {
        in: ["ABERTO", "EM_ANDAMENTO"]
      },
      prazoAlvo: {
        lt: today
      },
      responsavelUserId: null
    },
    orderBy: [{ prazoAlvo: "asc" }, { createdAt: "asc" }],
    take: 20,
    select: {
      id: true,
      codigo: true,
      titulo: true,
      status: true,
      prioridade: true,
      prazoAlvo: true,
      createdAt: true
    }
  });

  if (items.length === 0) {
    return {
      pergunta,
      intencao: "tickets_atrasados_sem_responsavel",
      confianca: "alta",
      resposta: "No momento, nao ha tickets atrasados sem responsavel.",
      dados: {
        total: 0
      },
      sugestoes: [
        "Quais tickets estao atrasados?",
        "Quais tickets estao sem responsavel?",
        "Mostre o ranking de cidades por desembolso"
      ]
    };
  }

  const sample = items.slice(0, 5).map((item) => {
    const diasAtraso = item.prazoAlvo ? Math.max(1, diffDays(item.prazoAlvo, today)) : null;
    return {
      codigo: item.codigo,
      titulo: item.titulo,
      prioridade: item.prioridade,
      status: item.status,
      prazo_alvo: item.prazoAlvo?.toISOString() ?? null,
      dias_atraso: diasAtraso
    };
  });

  return {
    pergunta,
    intencao: "tickets_atrasados_sem_responsavel",
    confianca: "alta",
    resposta: `Existem ${items.length} ticket(s) atrasados sem responsavel. Exemplo mais critico: ${items[0].codigo} (${items[0].titulo}).`,
    dados: {
      total: items.length,
      amostra: sample
    },
    sugestoes: [
      "Quais instrumentos ja venceram?",
      "Qual o percentual da obra 123?",
      "Qual valor de desembolso ja foi feito para a cidade de Parnamirim?"
    ]
  };
};

const responderVigenciasInstrumentos = async (pergunta: string): Promise<AssistenteResposta> => {
  const normalized = normalizeText(pergunta);
  const today = startOfToday();
  const windowDays = extractVigenciaDaysWindow(pergunta);
  const askExpired = hasAnyTerm(normalized, ["vencid", "ja venceram", "vencidas", "vencidos"]);

  const instruments = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true
    },
    select: {
      id: true,
      proposta: true,
      instrumento: true,
      vigenciaFim: true,
      status: true,
      convenete: {
        select: {
          cidade: true,
          uf: true
        }
      }
    },
    orderBy: [{ vigenciaFim: "asc" }]
  });

  const withDays = instruments.map((item) => ({
    ...item,
    diasParaVencer: diffDays(today, item.vigenciaFim)
  }));

  const filtered = askExpired
    ? withDays.filter((item) => item.diasParaVencer < 0)
    : windowDays !== null
      ? withDays.filter((item) => item.diasParaVencer >= 0 && item.diasParaVencer <= windowDays)
      : withDays.filter((item) => item.diasParaVencer < 0);

  const labelContext = askExpired
    ? "ja vencidos"
    : windowDays !== null
      ? `com vencimento em ate ${windowDays} dias`
      : "ja vencidos";

  if (filtered.length === 0) {
    return {
      pergunta,
      intencao: "vigencias_instrumentos",
      confianca: "alta",
      resposta: `Nao encontrei instrumentos ${labelContext}.`,
      dados: {
        total: 0,
        filtro: labelContext
      },
      sugestoes: [
        "Quais instrumentos vencem em 30 dias?",
        "Quais instrumentos ja venceram?",
        "Quais tickets estao atrasados e sem responsavel?"
      ]
    };
  }

  const sample = filtered.slice(0, 8).map((item) => ({
    id: item.id,
    proposta: item.proposta,
    instrumento: item.instrumento,
    status: item.status,
    vigencia_fim: item.vigenciaFim.toISOString(),
    dias_para_vencer: item.diasParaVencer,
    cidade: item.convenete?.cidade ?? null,
    uf: item.convenete?.uf ?? null
  }));

  return {
    pergunta,
    intencao: "vigencias_instrumentos",
    confianca: "alta",
    resposta: `Encontrei ${filtered.length} instrumento(s) ${labelContext}.`,
    dados: {
      total: filtered.length,
      filtro: labelContext,
      amostra: sample
    },
    sugestoes: [
      "Quais instrumentos vencem em 60 dias?",
      "Quais instrumentos vencem em 90 dias?",
      "Mostre o ranking de cidades por desembolso"
    ]
  };
};

const responderRankingCidadesDesembolso = async (pergunta: string): Promise<AssistenteResposta> => {
  const topN = extractTopN(pergunta, 5);

  const instruments = await prisma.instrumentProposal.findMany({
    where: {
      ativo: true
    },
    select: {
      id: true,
      valorJaRepassado: true,
      repasses: {
        select: {
          valorRepasse: true
        }
      },
      convenete: {
        select: {
          cidade: true,
          uf: true
        }
      }
    }
  });

  const cityMap = new Map<string, { cidade: string; uf: string; instrumentos: number; valor: number }>();

  for (const item of instruments) {
    const cidade = item.convenete?.cidade?.trim();
    const uf = item.convenete?.uf?.trim();
    if (!cidade || !uf) {
      continue;
    }

    const sumRepasses = item.repasses.reduce((acc, repasse) => acc + toNumber(repasse.valorRepasse), 0);
    const valorInstrumento = sumRepasses > 0 ? sumRepasses : toNumber(item.valorJaRepassado);
    const key = `${normalizeText(cidade)}-${normalizeText(uf)}`;
    const current = cityMap.get(key);

    if (!current) {
      cityMap.set(key, {
        cidade,
        uf,
        instrumentos: 1,
        valor: valorInstrumento
      });
      continue;
    }

    current.instrumentos += 1;
    current.valor += valorInstrumento;
  }

  const ranking = [...cityMap.values()]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, topN)
    .map((item, index) => ({
      posicao: index + 1,
      cidade: item.cidade,
      uf: item.uf,
      instrumentos: item.instrumentos,
      valor_desembolso: Number(item.valor.toFixed(2))
    }));

  if (ranking.length === 0) {
    return {
      pergunta,
      intencao: "ranking_cidades_desembolso",
      confianca: "media",
      resposta: "Nao encontrei dados suficientes para montar o ranking de cidades por desembolso.",
      dados: {
        total_cidades: 0,
        top: []
      },
      sugestoes: SUGESTOES_PADRAO
    };
  }

  const primeiro = ranking[0];
  return {
    pergunta,
    intencao: "ranking_cidades_desembolso",
    confianca: "alta",
    resposta: `Top ${ranking.length} cidades por desembolso calculado. A primeira e ${primeiro.cidade}/${primeiro.uf} com ${formatCurrency(primeiro.valor_desembolso)}.`,
    dados: {
      total_cidades: cityMap.size,
      top: ranking
    },
    sugestoes: [
      `Qual o desembolso da cidade de ${primeiro.cidade}?`,
      "Quais instrumentos vencem em 30 dias?",
      "Quais tickets estao atrasados e sem responsavel?"
    ]
  };
};

const responderPorRegras = async (pergunta: string): Promise<AssistenteResposta> => {
  if (isRankingCidadesDesembolsoQuestion(pergunta)) {
    return responderRankingCidadesDesembolso(pergunta);
  }

  if (isConveniosCidadeQuestion(pergunta)) {
    return responderConveniosPorCidade(pergunta);
  }

  if (isDesembolsoQuestion(pergunta)) {
    return responderDesembolsoPorCidade(pergunta);
  }

  if (isPercentualObraQuestion(pergunta)) {
    return responderPercentualObra(pergunta);
  }

  if (isTicketsAtrasadosSemResponsavelQuestion(pergunta)) {
    return responderTicketsAtrasadosSemResponsavel(pergunta);
  }

  if (isVigenciaQuestion(pergunta)) {
    return responderVigenciasInstrumentos(pergunta);
  }

  return buildFallbackResponse(pergunta);
};

const executarTool = async (name: string, rawArgs: string | undefined, perguntaOriginal: string) => {
  const args = safeParseJson<Record<string, unknown>>(rawArgs) ?? {};

  if (name === "get_convenios_por_cidade") {
    const cidade = String(args.cidade ?? "").trim();
    const status = String(args.status ?? "").trim().toUpperCase();
    const statusPhrase =
      status === "EM_EXECUCAO"
        ? "em execucao"
        : status === "CONCLUIDO"
          ? "concluidos"
          : status === "VENCIDO"
            ? "vencidos"
            : status === "EM_ELABORACAO"
              ? "em elaboracao"
              : "";

    if (cidade && statusPhrase) {
      return responderConveniosPorCidade(`Quantos convenios da cidade de ${cidade} estao ${statusPhrase}?`);
    }

    return responderConveniosPorCidade(cidade ? `Quantos convenios a cidade de ${cidade} tem hoje?` : perguntaOriginal);
  }

  if (name === "get_desembolso_por_cidade") {
    const cidade = String(args.cidade ?? "").trim();
    return responderDesembolsoPorCidade(
      cidade ? `Qual valor de desembolso ja foi feito para a cidade de ${cidade}?` : perguntaOriginal
    );
  }

  if (name === "get_percentual_obra") {
    const referencia = String(args.referencia ?? "").trim();
    return responderPercentualObra(
      referencia ? `Em quantos por cento esta a obra ${referencia}?` : perguntaOriginal
    );
  }

  if (name === "get_tickets_atrasados_sem_responsavel") {
    return responderTicketsAtrasadosSemResponsavel(perguntaOriginal);
  }

  if (name === "get_vigencias_instrumentos") {
    const status = String(args.status ?? "").trim().toLowerCase();
    const diasArg = Number(args.dias ?? 30);
    const dias = Number.isFinite(diasArg) ? Math.max(1, Math.min(180, Math.floor(diasArg))) : 30;
    if (status === "vencidas") {
      return responderVigenciasInstrumentos("Quais instrumentos ja venceram?");
    }
    return responderVigenciasInstrumentos(`Quais instrumentos vencem em ${dias} dias?`);
  }

  if (name === "get_ranking_cidades_desembolso") {
    const topArg = Number(args.top ?? 5);
    const top = Number.isFinite(topArg) ? Math.max(1, Math.min(20, Math.floor(topArg))) : 5;
    return responderRankingCidadesDesembolso(`Top ${top} cidades por desembolso`);
  }

  return buildFallbackResponse(perguntaOriginal);
};

const sintetizarRespostaNatural = async (
  client: OpenAI,
  pergunta: string,
  resultado: AssistenteResposta
): Promise<string> => {
  try {
    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0.2,
      max_tokens: 400,
      messages: [
        {
          role: "system",
          content:
            "Voce e o Assistente 360 do Gestconv. Responda em pt-BR, com objetividade, sem inventar dados e sem markdown complexo. Use apenas o resultado da consulta interna fornecida."
        },
        {
          role: "user",
          content: `Pergunta do usuario: ${pergunta}\n\nResultado interno estruturado:\n${JSON.stringify(resultado.dados ?? {}, null, 2)}\n\nResposta base: ${resultado.resposta}\n\nGere uma resposta natural e direta.`
        }
      ]
    });

    return completion.choices[0]?.message?.content?.trim() || resultado.resposta;
  } catch {
    return resultado.resposta;
  }
};

export const responderPerguntaAssistente = async (payload: AssistentePerguntaInput): Promise<AssistenteResposta> => {
  const pergunta = payload.pergunta.trim();
  const historico = (payload.historico ?? []).map((item) => ({ role: item.role, text: item.text.trim() })).filter((item) => item.text !== "");
  const client = getOpenAIClient();
  const getContextFlag = (perguntaContextual: string) => normalizeText(perguntaContextual) !== normalizeText(pergunta);

  if (!client) {
    const perguntaContextual = resolveQuestionWithRules(pergunta, historico);
    const contextoUsado = getContextFlag(perguntaContextual);
    const fallback = await responderPorRegras(perguntaContextual);
    return {
      ...fallback,
      pergunta,
      contexto_usado: contextoUsado,
      pergunta_interpretada: contextoUsado ? perguntaContextual : undefined,
      resposta: `${fallback.resposta} (OpenAI nao configurada: defina OPENAI_API_KEY para habilitar interpretacao por IA.)`,
      sugestoes: []
    };
  }

  try {
    const perguntaContextual = await resolveQuestionWithAI(client, pergunta, historico);
    const contextoUsado = getContextFlag(perguntaContextual);

    const completion = await client.chat.completions.create({
      model: env.openaiModel,
      temperature: 0,
      max_tokens: 200,
      tools: ASSISTENTE_TOOLS,
      tool_choice: "auto",
      messages: [
        {
          role: "system",
          content:
            "Voce decide qual funcao interna consultar para responder perguntas do Gestconv360. Sempre priorize chamar uma funcao (tool). Nao invente dados. Se houver pergunta contextualizada, use-a para escolher a tool."
        },
        {
          role: "user",
          content: JSON.stringify({
            pergunta_original: pergunta,
            pergunta_contextualizada: perguntaContextual,
            historico: historico.slice(-10)
          })
        }
      ]
    });

    const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.type !== "function") {
      const fallback = await responderPorRegras(perguntaContextual);
      return {
        ...fallback,
        pergunta,
        contexto_usado: contextoUsado,
        pergunta_interpretada: contextoUsado ? perguntaContextual : undefined,
        sugestoes: []
      };
    }

    const consulta = await executarTool(toolCall.function.name, toolCall.function.arguments, perguntaContextual);
    const respostaNatural = await sintetizarRespostaNatural(client, pergunta, consulta);

    return {
      ...consulta,
      pergunta,
      contexto_usado: contextoUsado,
      pergunta_interpretada: contextoUsado ? perguntaContextual : undefined,
      resposta: respostaNatural,
      sugestoes: []
    };
  } catch {
    const perguntaContextual = resolveQuestionWithRules(pergunta, historico);
    const contextoUsado = getContextFlag(perguntaContextual);
    const fallback = await responderPorRegras(perguntaContextual);
    return {
      ...fallback,
      pergunta,
      contexto_usado: contextoUsado,
      pergunta_interpretada: contextoUsado ? perguntaContextual : undefined,
      sugestoes: []
    };
  }
};
