-- CreateTable
CREATE TABLE "InstrumentStageFollowUp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instrumentId" INTEGER NOT NULL,
    "etapa" TEXT NOT NULL,
    "texto" TEXT,
    "userId" INTEGER,
    "userEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstrumentStageFollowUp_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InstrumentStageFollowUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstrumentStageFollowUpFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "followUpId" INTEGER NOT NULL,
    "arquivoPath" TEXT NOT NULL,
    "arquivoNomeOriginal" TEXT NOT NULL,
    "arquivoMimeType" TEXT,
    "arquivoTamanho" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstrumentStageFollowUpFile_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "InstrumentStageFollowUp" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InstrumentStageFollowUp_instrumentId_etapa_createdAt_idx" ON "InstrumentStageFollowUp"("instrumentId", "etapa", "createdAt");

-- CreateIndex
CREATE INDEX "InstrumentStageFollowUpFile_followUpId_createdAt_idx" ON "InstrumentStageFollowUpFile"("followUpId", "createdAt");
