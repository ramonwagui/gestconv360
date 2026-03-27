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

export const createCertificate = async (
  data: {
    nome: string;
    titular: string;
    cpf: string;
    validade: Date;
    arquivoBase64: string;
    senha: string;
  },
  userId: number
) => {
  ensureUploadDir();

  const arquivoNome = `${Date.now()}-${data.nome.replace(/[^a-zA-Z0-9]/g, "_")}.pfx`;
  const arquivoPath = `${UPLOAD_DIR}/${arquivoNome}`;

  const fs = require("fs");
  const buffer = Buffer.from(data.arquivoBase64, "base64");
  fs.writeFileSync( arquivoPath, buffer);

  const senhaHash = crypto.createHash("sha256").update(data.senha).digest("hex");

  const now = new Date();
  const status = data.validade < now ? CertificateStatus.EXPIRADO : CertificateStatus.ATIVO;

  return prisma.digitalCertificate.create({
    data: {
      nome: data.nome,
      titular: data.titular,
      cpf: data.cpf,
      validade: data.validade,
      status,
      arquivoPath,
      senhaHash,
      createdByUserId: userId
    }
  });
};

export const listCertificates = async (options?: {
  status?: CertificateStatus;
  limit?: number;
  offset?: number;
}) => {
  const where: any = {};
  if (options?.status) {
    where.status = options.status;
  }

  const certificados = await prisma.digitalCertificate.findMany({
    where,
    include: {
      createdByUser: {
        select: { id: true, nome: true, email: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0
  });

  const total = await prisma.digitalCertificate.count({ where });

  return { certificados, total };
};

export const getCertificateById = async (id: number) => {
  return prisma.digitalCertificate.findUnique({
    where: { id },
    include: {
      createdByUser: {
        select: { id: true, nome: true, email: true }
      },
      signatures: {
        include: {
          document: {
            select: { id: true, titulo: true, arquivoNome: true }
          },
          signedByUser: {
            select: { id: true, nome: true, email: true }
          }
        },
        orderBy: { signedAt: "desc" }
      }
    }
  });
};

export const validateCertificatePassword = async (id: number, senha: string) => {
  const certificado = await prisma.digitalCertificate.findUnique({
    where: { id },
    select: { senhaHash: true, status: true }
  });

  if (!certificado) {
    throw new Error("Certificado nao encontrado");
  }

  if (certificado.status === CertificateStatus.EXPIRADO) {
    throw new Error("Certificado expirado");
  }

  if (certificado.status === CertificateStatus.REVOGADO) {
    throw new Error("Certificado revogado");
  }

  const senhaHash = crypto.createHash("sha256").update(senha).digest("hex");
  
  if (senhaHash !== certificado.senhaHash) {
    return false;
  }

  return true;
};

export const getCertificateForSigning = async (id: number) => {
  const certificado = await prisma.digitalCertificate.findUnique({
    where: { id },
    select: {
      id: true,
      nome: true,
      titular: true,
      cpf: true,
      arquivoPath: true,
      status: true,
      validade: true
    }
  });

  if (!certificado) {
    throw new Error("Certificado nao encontrado");
  }

  if (certificado.status !== CertificateStatus.ATIVO) {
    throw new Error("Certificado nao esta ativo");
  }

  if (certificado.validade < new Date()) {
    await prisma.digitalCertificate.update({
      where: { id },
      data: { status: CertificateStatus.EXPIRADO }
    });
    throw new Error("Certificado expirado");
  }

  return certificado;
};

export const deactivateCertificate = async (id: number) => {
  return prisma.digitalCertificate.update({
    where: { id },
    data: { status: CertificateStatus.REVOGADO }
  });
};

export const getActiveCertificates = async () => {
  const now = new Date();
  
  await prisma.digitalCertificate.updateMany({
    where: {
      status: CertificateStatus.ATIVO,
      validade: { lt: now }
    },
    data: { status: CertificateStatus.EXPIRADO }
  });

  return prisma.digitalCertificate.findMany({
    where: { status: CertificateStatus.ATIVO },
    select: {
      id: true,
      nome: true,
      titular: true,
      cpf: true,
      validade: true
    },
    orderBy: { nome: "asc" }
  });
};