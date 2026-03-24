import { z } from "zod";

export const instrumentStatusSchema = z.enum([
  "EM_ELABORACAO",
  "ASSINADO",
  "EM_EXECUCAO",
  "VENCIDO",
  "PRESTACAO_PENDENTE",
  "CONCLUIDO"
]);

const dateString = z.string().date();

const optionalText = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalDateString = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}, dateString.optional());

const optionalConveneteId = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().positive().optional());

const instrumentBaseSchema = z.object({
  proposta: z.string().min(1).max(40),
  instrumento: z.string().min(1).max(40),
  objeto: z.string().min(3),
  valor_repasse: z.coerce.number().min(0),
  valor_contrapartida: z.coerce.number().min(0),
  data_cadastro: dateString,
  data_assinatura: optionalDateString,
  vigencia_inicio: dateString,
  vigencia_fim: dateString,
  data_prestacao_contas: optionalDateString,
  data_dou: optionalDateString,
  concedente: z.string().min(2).max(120),
  convenete_id: optionalConveneteId,
  status: instrumentStatusSchema.default("EM_ELABORACAO"),
  responsavel: optionalText,
  orgao_executor: optionalText,
  observacoes: optionalText
});

export const createInstrumentSchema = instrumentBaseSchema.superRefine((input, ctx) => {
    const vigenciaInicio = new Date(input.vigencia_inicio);
    const vigenciaFim = new Date(input.vigencia_fim);

    if (vigenciaFim < vigenciaInicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vigencia_fim"],
        message: "vigencia_fim deve ser maior ou igual a vigencia_inicio"
      });
    }

    if (input.data_assinatura && new Date(input.data_assinatura) > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data_assinatura"],
        message: "data_assinatura nao pode ser futura"
      });
    }
});

export const updateInstrumentSchema = instrumentBaseSchema.partial().extend({
  ativo: z.boolean().optional()
});

export const listQuerySchema = z.object({
  status: instrumentStatusSchema.optional(),
  concedente: z.string().optional(),
  ativo: z.coerce.boolean().optional().default(true),
  vigencia_de: dateString.optional(),
  vigencia_ate: dateString.optional()
});

export const alertQuerySchema = z.object({
  limite_dias: z.coerce.number().int().min(1).max(365).default(30)
});

export const checklistItemCreateSchema = z.object({
  nome_documento: z.string().min(3).max(180),
  obrigatorio: z.boolean().optional().default(true),
  observacao: optionalText,
  ordem: z.coerce.number().int().min(0).optional()
});

export const checklistItemUpdateSchema = checklistItemCreateSchema.partial();

export const checklistItemIdParamSchema = z.object({
  itemId: z.coerce.number().int().positive()
});

export type CreateInstrumentInput = z.infer<typeof createInstrumentSchema>;
export type UpdateInstrumentInput = z.infer<typeof updateInstrumentSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type AlertQueryInput = z.infer<typeof alertQuerySchema>;
export type ChecklistItemCreateInput = z.infer<typeof checklistItemCreateSchema>;
export type ChecklistItemUpdateInput = z.infer<typeof checklistItemUpdateSchema>;
