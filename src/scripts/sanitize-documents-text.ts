import { prisma } from "../lib/prisma";
import { sanitizeDocumentTitle, sanitizeOptionalText } from "../modules/documents/documents-text.util";

const BATCH_SIZE = 200;

const sanitizeTitleSafe = (value: string) => {
  const sanitized = sanitizeDocumentTitle(value);
  if (sanitized.length > 0) {
    return sanitized;
  }

  const fallback = value.trim();
  return fallback.length > 0 ? fallback : value;
};

const sanitizeDocumentsTable = async () => {
  let cursorId: number | undefined;
  let updated = 0;

  while (true) {
    const rows = await prisma.document.findMany({
      select: {
        id: true,
        titulo: true,
        descricao: true,
        arquivoNome: true
      },
      orderBy: {
        id: "asc"
      },
      take: BATCH_SIZE,
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1
          }
        : {})
    });

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const tituloSanitizado = sanitizeTitleSafe(row.titulo);
      const descricaoSanitizada = sanitizeOptionalText(row.descricao);
      const arquivoNomeSanitizado = sanitizeDocumentTitle(row.arquivoNome, 255);

      if (
        tituloSanitizado === row.titulo &&
        descricaoSanitizada === row.descricao &&
        arquivoNomeSanitizado === row.arquivoNome
      ) {
        continue;
      }

      await prisma.document.update({
        where: { id: row.id },
        data: {
          titulo: tituloSanitizado,
          descricao: descricaoSanitizada,
          arquivoNome: arquivoNomeSanitizado
        }
      });

      updated += 1;
    }

    cursorId = rows[rows.length - 1]?.id;
  }

  return updated;
};

const sanitizeDocumentAiRequestsTable = async () => {
  let cursorId: number | undefined;
  let updated = 0;

  while (true) {
    const rows = await prisma.documentAiRequest.findMany({
      select: {
        id: true,
        titulo: true,
        descricao: true
      },
      orderBy: {
        id: "asc"
      },
      take: BATCH_SIZE,
      ...(cursorId
        ? {
            cursor: { id: cursorId },
            skip: 1
          }
        : {})
    });

    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const tituloSanitizado = sanitizeTitleSafe(row.titulo);
      const descricaoSanitizada = sanitizeOptionalText(row.descricao);

      if (tituloSanitizado === row.titulo && descricaoSanitizada === row.descricao) {
        continue;
      }

      await prisma.documentAiRequest.update({
        where: { id: row.id },
        data: {
          titulo: tituloSanitizado,
          descricao: descricaoSanitizada
        }
      });

      updated += 1;
    }

    cursorId = rows[rows.length - 1]?.id;
  }

  return updated;
};

const run = async () => {
  const [documentosAtualizados, solicitacoesAtualizadas] = await Promise.all([
    sanitizeDocumentsTable(),
    sanitizeDocumentAiRequestsTable()
  ]);

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        status: "ok",
        documentos_atualizados: documentosAtualizados,
        solicitacoes_ia_atualizadas: solicitacoesAtualizadas,
        total_atualizados: documentosAtualizados + solicitacoesAtualizadas
      },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
