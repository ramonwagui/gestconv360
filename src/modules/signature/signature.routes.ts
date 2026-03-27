import { Router } from "express";
import { z } from "zod";
import { authenticate, validateBody } from "../../middlewares/auth";
import * as signatureService from "./signature.service";

export const signatureRouter = Router();

signatureRouter.use(authenticate);

const signDocumentSchema = z.object({
  document_id: z.number().positive("ID do documento e obrigatorio"),
  certificate_id: z.number().positive("ID do certificado e obrigatorio"),
  senha: z.string().min(1, "Senha do certificado e obrigatoria")
});

signatureRouter.post(
  "/sign",
  validateBody(signDocumentSchema),
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const { document_id, certificate_id, senha } = req.body;

      const result = await signatureService.signDocument({
        documentId: document_id,
        certificateId: certificate_id,
        senha,
        userId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      });

      return res.json({
        message: "Documento assinado com sucesso",
        signature_id: result.signatureId,
        assinado_em: result.signedAt.toISOString()
      });
    } catch (error) {
      return res.status(400).json({
        message: error instanceof Error ? error.message : "Falha ao assinar documento"
      });
    }
  }
);

signatureRouter.get("/documento/:id/historico", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const historico = await signatureService.getDocumentSignatureInfo(id);
    return res.json(historico);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Falha ao buscar historico"
    });
  }
});