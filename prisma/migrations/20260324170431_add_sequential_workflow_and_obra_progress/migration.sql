-- CreateTable
CREATE TABLE "InstrumentWorkProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instrumentId" INTEGER NOT NULL,
    "percentualObra" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstrumentWorkProgress_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstrumentMeasurementBulletin" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instrumentId" INTEGER NOT NULL,
    "dataBoletim" DATETIME NOT NULL,
    "valorMedicao" DECIMAL NOT NULL,
    "percentualObraInformado" DECIMAL,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstrumentMeasurementBulletin_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InstrumentChecklistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instrumentId" INTEGER NOT NULL,
    "etapa" TEXT NOT NULL DEFAULT 'REQUISITOS_CELEBRACAO',
    "status" TEXT NOT NULL DEFAULT 'NAO_INICIADO',
    "nomeDocumento" TEXT NOT NULL,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT true,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "observacao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "arquivoPath" TEXT,
    "arquivoNomeOriginal" TEXT,
    "arquivoMimeType" TEXT,
    "arquivoTamanho" INTEGER,
    "uploadedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstrumentChecklistItem_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_InstrumentChecklistItem" ("arquivoMimeType", "arquivoNomeOriginal", "arquivoPath", "arquivoTamanho", "concluido", "createdAt", "id", "instrumentId", "nomeDocumento", "obrigatorio", "observacao", "ordem", "updatedAt", "uploadedAt") SELECT "arquivoMimeType", "arquivoNomeOriginal", "arquivoPath", "arquivoTamanho", "concluido", "createdAt", "id", "instrumentId", "nomeDocumento", "obrigatorio", "observacao", "ordem", "updatedAt", "uploadedAt" FROM "InstrumentChecklistItem";
DROP TABLE "InstrumentChecklistItem";
ALTER TABLE "new_InstrumentChecklistItem" RENAME TO "InstrumentChecklistItem";
CREATE INDEX "InstrumentChecklistItem_instrumentId_ordem_idx" ON "InstrumentChecklistItem"("instrumentId", "ordem");
CREATE INDEX "InstrumentChecklistItem_instrumentId_etapa_ordem_idx" ON "InstrumentChecklistItem"("instrumentId", "etapa", "ordem");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentWorkProgress_instrumentId_key" ON "InstrumentWorkProgress"("instrumentId");

-- CreateIndex
CREATE INDEX "InstrumentMeasurementBulletin_instrumentId_dataBoletim_idx" ON "InstrumentMeasurementBulletin"("instrumentId", "dataBoletim");
