import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalCnpj = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const digits = value.replace(/\D/g, "");
  return digits === "" ? undefined : digits;
}, z.string().length(14).optional());

const optionalUf = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim().toUpperCase();
  return trimmed === "" ? undefined : trimmed;
}, z.string().length(2).optional());

const optionalYear = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().min(2019).max(2100).optional());

export const planoAcaoEspecialQuerySchema = z.object({
  cnpj: optionalCnpj,
  nome_beneficiario: optionalText,
  uf: optionalUf,
  ano: optionalYear,
  situacao: optionalText,
  codigo_plano_acao: optionalText,
  parlamentar: optionalText,
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20)
});

export type PlanoAcaoEspecialQueryInput = z.infer<typeof planoAcaoEspecialQuerySchema>;
