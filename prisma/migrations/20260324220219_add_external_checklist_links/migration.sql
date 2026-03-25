-- CreateTable
CREATE TABLE "InstrumentChecklistExternalLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "checklistItemId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "expiraEm" DATETIME NOT NULL,
    "createdByUserId" INTEGER,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstrumentChecklistExternalLink_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "InstrumentChecklistItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InstrumentChecklistExternalLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InstrumentChecklistExternalFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "externalLinkId" INTEGER NOT NULL,
    "nomeRemetente" TEXT NOT NULL,
    "arquivoPath" TEXT NOT NULL,
    "arquivoNomeOriginal" TEXT NOT NULL,
    "arquivoMimeType" TEXT,
    "arquivoTamanho" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstrumentChecklistExternalFile_externalLinkId_fkey" FOREIGN KEY ("externalLinkId") REFERENCES "InstrumentChecklistExternalLink" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentChecklistExternalLink_token_key" ON "InstrumentChecklistExternalLink"("token");

-- CreateIndex
CREATE INDEX "InstrumentChecklistExternalLink_checklistItemId_ativo_idx" ON "InstrumentChecklistExternalLink"("checklistItemId", "ativo");

-- CreateIndex
CREATE INDEX "InstrumentChecklistExternalLink_token_ativo_idx" ON "InstrumentChecklistExternalLink"("token", "ativo");

-- CreateIndex
CREATE INDEX "InstrumentChecklistExternalLink_expiraEm_idx" ON "InstrumentChecklistExternalLink"("expiraEm");

-- CreateIndex
CREATE INDEX "InstrumentChecklistExternalFile_externalLinkId_createdAt_idx" ON "InstrumentChecklistExternalFile"("externalLinkId", "createdAt");
