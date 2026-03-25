import { z } from "zod";

const instrumentStatusSchema = z.enum([
  "EM_ELABORACAO",
  "ASSINADO",
  "EM_EXECUCAO",
  "VENCIDO",
  "PRESTACAO_PENDENTE",
  "CONCLUIDO"
]);

const optionalDate = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.string().date().optional());

const optionalPositiveInt = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().positive().optional());

export const repasseReportQuerySchema = z
  .object({
    convenete_id: z.coerce.number().int().positive(),
    instrumento_id: optionalPositiveInt,
    data_de: optionalDate,
    data_ate: optionalDate
  })
  .refine(
    (value) => {
      if (!value.data_de || !value.data_ate) {
        return true;
      }
      return value.data_de <= value.data_ate;
    },
    {
      message: "data_de deve ser menor ou igual a data_ate",
      path: ["data_ate"]
    }
  );

export type RepasseReportQueryInput = z.infer<typeof repasseReportQuerySchema>;

export const obraReportQuerySchema = z
  .object({
    convenete_id: optionalPositiveInt,
    instrumento_id: optionalPositiveInt,
    status: instrumentStatusSchema.optional(),
    ativo: z.coerce.boolean().optional().default(true),
    data_de: optionalDate,
    data_ate: optionalDate
  })
  .refine(
    (value) => {
      if (!value.data_de || !value.data_ate) {
        return true;
      }
      return value.data_de <= value.data_ate;
    },
    {
      message: "data_de deve ser menor ou igual a data_ate",
      path: ["data_ate"]
    }
  );

export type ObraReportQueryInput = z.infer<typeof obraReportQuerySchema>;
