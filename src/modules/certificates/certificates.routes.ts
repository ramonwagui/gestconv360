import { Router } from "express";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { prisma } from "../../lib/prisma";
import { CertificateStatus } from "@prisma/client";
import * as crypto from "crypto";

const UPLOAD_DIR = "./uploads/certificates";

const ensureUploadDir = () => {
  const fs = require("fs");
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
};

export const certificatesRouter = Router();
certificatesRouter.use(authenticate);

certificatesRouter.post("/", authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Usuário não identificado" });
    }

    const { nome, titular, cpf, validade, arquivo, senha } = req.body;
    
    if (!nome || !titular || !cpf || !validade || !arquivo || !senha) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    ensureUploadDir();

    const fs = require("fs");
    let base64Data = arquivo;
    if (arquivo.startsWith("data:")) {
      base64Data = arquivo.split(",")[1];
    }

    const buffer = Buffer.from(base64Data, "base64");
    const arquivoNome = `${Date.now()}-${nome.replace(/[^a-zA-Z0-9]/g, "_")}.pfx`;
    const arquivoPath = `${UPLOAD_DIR}/${arquivoNome}`;
    
    fs.writeFileSync(arquivoPath, buffer);

    const senhaHash = crypto.createHash("sha256").update(senha).digest("hex");
    const validadeDate = new Date(validade);
    const now = new Date();
    const status = validadeDate < now ? CertificateStatus.EXPIRADO : CertificateStatus.ATIVO;

    const certificado = await prisma.digitalCertificate.create({
      data: {
        nome,
        titular,
        cpf,
        validade: validadeDate,
        status,
        arquivoPath,
        senhaHash,
        createdByUserId: userId
      }
    });

    return res.status(201).json({
      id: certificado.id,
      nome: certificado.nome,
      titular: certificado.titular,
      cpf: certificado.cpf,
      validade: certificado.validade.toISOString(),
      status: certificado.status,
      createdAt: certificado.createdAt.toISOString()
    });
  } catch (error: any) {
    console.error("[certificates] Error:", error.message);
    return res.status(400).json({ message: error.message || "Falha ao criar certificado" });
  }
});

certificatesRouter.get("/", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const where: any = {};
    if (status) where.status = status;

    const certificados = await prisma.digitalCertificate.findMany({
      where,
      include: { createdByUser: { select: { id: true, nome: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const total = await prisma.digitalCertificate.count({ where });

    return res.json({
      certificados: certificados.map((cert) => ({
        id: cert.id,
        nome: cert.nome,
        titular: cert.titular,
        cpf: cert.cpf,
        validade: cert.validade.toISOString(),
        status: cert.status,
        createdAt: cert.createdAt.toISOString(),
        criado_por: cert.createdByUser
      })),
      total
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Falha ao listar certificados" });
  }
});

certificatesRouter.get("/ativos", async (_req, res) => {
  try {
    const now = new Date();
    await prisma.digitalCertificate.updateMany({
      where: { status: CertificateStatus.ATIVO, validade: { lt: now } },
      data: { status: CertificateStatus.EXPIRADO }
    });

    const certificados = await prisma.digitalCertificate.findMany({
      where: { status: CertificateStatus.ATIVO },
      select: { id: true, nome: true, titular: true, cpf: true, validade: true },
      orderBy: { nome: "asc" }
    });
    return res.json(certificados);
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao buscar certificados ativos" });
  }
});

certificatesRouter.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const certificado = await prisma.digitalCertificate.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, nome: true, email: true } },
        signatures: {
          include: {
            document: { select: { id: true, titulo: true, arquivoNome: true } },
            signedByUser: { select: { id: true, nome: true, email: true } }
          },
          orderBy: { signedAt: "desc" }
        }
      }
    });

    if (!certificado) {
      return res.status(404).json({ message: "Certificado não encontrado" });
    }

    return res.json({
      id: certificado.id,
      nome: certificado.nome,
      titular: certificado.titular,
      cpf: certificado.cpf,
      validade: certificado.validade.toISOString(),
      status: certificado.status,
      createdAt: certificado.createdAt.toISOString(),
      criado_por: certificado.createdByUser,
      assinaturas: certificado.signatures.map((sig) => ({
        id: sig.id,
        documento: sig.document,
        assinado_em: sig.signedAt.toISOString(),
        assinante: sig.signedByUser
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao buscar certificado" });
  }
});

certificatesRouter.patch("/:id/revogar", authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const paramId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = Number.parseInt(paramId, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "ID de certificado invalido" });
    }

    const certificado = await prisma.digitalCertificate.update({
      where: { id },
      data: { status: CertificateStatus.REVOGADO }
    });
    return res.json({ id: certificado.id, status: certificado.status });
  } catch (error: any) {
    return res.status(400).json({ message: error.message || "Falha ao revogar certificado" });
  }
});
