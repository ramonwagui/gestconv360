import { DocumentAiRequestPriority, DocumentAiRequestStatus } from "@prisma/client";
import { z } from "zod";

export const requestIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const publicTokenParamSchema = z.object({
  token: z.string().trim().min(24).max(200)
});

export const createDocumentAiRequestSchema = z.object({
  titulo: z.string().trim().min(3, "Informe um titulo com pelo menos 3 caracteres.").max(180),
  descricao: z.string().trim().max(2000).optional(),
  prioridade: z.nativeEnum(DocumentAiRequestPriority).optional(),
  prazo: z.string().datetime().optional()
});

export const updateDocumentAiRequestSchema = z
  .object({
    titulo: z.string().trim().min(3).max(180).optional(),
    descricao: z.string().trim().max(2000).nullable().optional(),
    prioridade: z.nativeEnum(DocumentAiRequestPriority).optional(),
    status: z.nativeEnum(DocumentAiRequestStatus).optional(),
    prazo: z.string().datetime().nullable().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "Informe ao menos um campo para atualizacao."
  });

export const listDocumentAiRequestsQuerySchema = z.object({
  status: z.nativeEnum(DocumentAiRequestStatus).optional(),
  prioridade: z.nativeEnum(DocumentAiRequestPriority).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

export const uploadRequestDocumentBodySchema = z.object({
  titulo_documento: z.string().trim().min(3).max(180).optional(),
  descricao_documento: z.string().trim().max(2000).optional()
});

export const createDocumentAiRequestPublicLinkSchema = z.object({
  validade_dias: z.coerce.number().int().min(1).max(30).default(7)
});

export const publicUploadRequestDocumentBodySchema = z.object({
  nome_remetente: z.string().trim().min(2, "Informe seu nome.").max(120)
});

export type CreateDocumentAiRequestInput = z.infer<typeof createDocumentAiRequestSchema>;
export type UpdateDocumentAiRequestInput = z.infer<typeof updateDocumentAiRequestSchema>;
export type ListDocumentAiRequestsQuery = z.infer<typeof listDocumentAiRequestsQuerySchema>;
export type UploadRequestDocumentBody = z.infer<typeof uploadRequestDocumentBodySchema>;
export type CreateDocumentAiRequestPublicLinkInput = z.infer<typeof createDocumentAiRequestPublicLinkSchema>;
export type PublicUploadRequestDocumentBody = z.infer<typeof publicUploadRequestDocumentBodySchema>;
