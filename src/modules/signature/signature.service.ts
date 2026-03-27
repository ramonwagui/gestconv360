import * as certificatesService from "../certificates/certificates.service";
import * as documentsService from "../documents/documents.service";
import { prisma } from "../../lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface SignDocumentParams {
  documentId: number;
  certificateId: number;
  senha: string;
  userId: number;
  ipAddress?: string;
  userAgent?: string;
}

export const signDocument = async (params: SignDocumentParams) => {
  const { documentId, certificateId, senha, userId, ipAddress, userAgent } = params;

  const documento = await documentsService.getDocumentById(documentId);
  if (!documento) {
    throw new Error("Documento nao encontrado");
  }

  if (documento.status === "ASSINADO") {
    throw new Error("Documento ja esta assinado");
  }

  const certValido = await certificatesService.validateCertificatePassword(certificateId, senha);
  if (!certValido) {
    throw new Error("Senha do certificado incorreta");
  }

  const certificado = await certificatesService.getCertificateForSigning(certificateId);
  if (!certificado) {
    throw new Error("Certificado nao disponivel para assinatura");
  }

  const fs = require("fs");
  if (!fs.existsSync(documento.arquivoPath)) {
    throw new Error("Arquivo do documento nao encontrado");
  }

  const pdfBuffer = fs.readFileSync(documento.arquivoPath);

  const signedPdfBuffer = await applyDigitalSignature(
    pdfBuffer,
    certificado,
    documento
  );

  const signedPath = documento.arquivoPath.replace(".pdf", "-assinado.pdf");
  fs.writeFileSync(signedPath, signedPdfBuffer);

  await documentsService.markDocumentAsSigned(documentId);

  const signatureRecord = await prisma.documentSignature.create({
    data: {
      documentId,
      certificateId,
      signedByUserId: userId,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null
    }
  });

  return {
    signatureId: signatureRecord.id,
    signedPath,
    signedAt: signatureRecord.signedAt
  };
};

async function applyDigitalSignature(
  pdfBuffer: Buffer,
  certificado: any,
  documento: any
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  const pages = pdfDoc.getPages();
  if (pages.length === 0) {
    throw new Error("PDF sem paginas");
  }

  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 9;
  const fontSizeSmall = 8;

  const signatureText = [
    `ASSINATURA DIGITAL`,
    `Certificado: ${certificado.nome}`,
    `Titular: ${certificado.titular}`,
    `CPF: ${certificado.cpf}`,
    `Documento: ${documento.titulo}`,
    `Data: ${new Date().toISOString().replace("T", " ").slice(0, 19)}`,
    `Assinado via GestConv360`
  ];

  const boxWidth = 280;
  const boxHeight = 95;
  const margin = 20;
  const x = width - boxWidth - margin;
  const y = margin;

  lastPage.drawRectangle({
    x,
    y,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0.2, 0.4, 0.7),
    borderWidth: 1,
    color: rgb(0.95, 0.97, 1),
  });

  let textY = y + boxHeight - 15;
  for (let i = 0; i < signatureText.length; i++) {
    const line = signatureText[i];
    const isTitle = i === 0;
    
    lastPage.drawText(line, {
      x: x + 10,
      y: textY,
      size: isTitle ? fontSize : fontSizeSmall,
      font: font,
      color: isTitle ? rgb(0.1, 0.3, 0.6) : rgb(0.2, 0.2, 0.2),
    });
    textY -= isTitle ? 15 : 12;
  }

  const signedPdfBytes = await pdfDoc.save();
  return Buffer.from(signedPdfBytes);
}

export const getDocumentSignatureInfo = async (documentId: number) => {
  const documento = await documentsService.getDocumentById(documentId);
  if (!documento) {
    throw new Error("Documento nao encontrado");
  }

  return documento.signatures.map((sig) => ({
    id: sig.id,
    certificado: sig.certificate.nome,
    titular: sig.certificate.titular,
    cpf: sig.certificate.cpf,
    assinado_em: sig.signedAt.toISOString(),
    assinante: sig.signedByUser.nome,
    ip: sig.ipAddress,
    userAgent: sig.userAgent
  }));
};