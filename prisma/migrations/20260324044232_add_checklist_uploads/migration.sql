-- CreateTable
CREATE TABLE "InstrumentChecklistItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instrumentId" INTEGER NOT NULL,
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

-- CreateIndex
CREATE INDEX "InstrumentChecklistItem_instrumentId_ordem_idx" ON "InstrumentChecklistItem"("instrumentId", "ordem");
