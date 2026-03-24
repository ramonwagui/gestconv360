import { z } from "zod";

const cnpjRegex = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
const cepRegex = /^\d{5}-?\d{3}$/;

const conveneteBaseSchema = z.object({
  nome: z.string().min(2).max(160),
  cnpj: z.string().regex(cnpjRegex, "CNPJ invalido"),
  endereco: z.string().min(3).max(180),
  bairro: z.string().min(2).max(120),
  cep: z.string().regex(cepRegex, "CEP invalido"),
  uf: z.string().trim().toUpperCase().length(2),
  cidade: z.string().min(2).max(120),
  tel: z.string().min(8).max(24),
  email: z.string().email().max(160)
});

export const createConveneteSchema = conveneteBaseSchema;

export const updateConveneteSchema = conveneteBaseSchema.partial().refine((input) => Object.keys(input).length > 0, {
  message: "Informe ao menos um campo para atualizar"
});

export type CreateConveneteInput = z.infer<typeof createConveneteSchema>;
export type UpdateConveneteInput = z.infer<typeof updateConveneteSchema>;
