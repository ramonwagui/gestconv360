/*
  Warnings:

  - You are about to drop the column `documentId` on the `DocumentAiRequest` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "DocumentAiRequestPublicLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requestId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "expiraEm" DATETIME NOT NULL,
    "createdByUserId" INTEGER,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentAiRequestPublicLink_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DocumentAiRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentAiRequestPublicLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "arquivoPath" TEXT NOT NULL,
    "arquivoNome" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "indexStatus" TEXT NOT NULL DEFAULT 'PENDENTE',
    "indexedAt" DATETIME,
    "indexError" TEXT,
    "aiSummary" TEXT,
    "aiKeywords" TEXT,
    "aiCategory" TEXT,
    "aiRiskLevel" TEXT,
    "aiClassificationConfidence" REAL,
    "aiInsights" TEXT,
    "createdByUserId" INTEGER NOT NULL,
    "aiRequestId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_aiRequestId_fkey" FOREIGN KEY ("aiRequestId") REFERENCES "DocumentAiRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("aiCategory", "aiClassificationConfidence", "aiInsights", "aiKeywords", "aiRiskLevel", "aiSummary", "arquivoNome", "arquivoPath", "createdAt", "createdByUserId", "descricao", "id", "indexError", "indexStatus", "indexedAt", "status", "titulo", "updatedAt", "aiRequestId") SELECT "aiCategory", "aiClassificationConfidence", "aiInsights", "aiKeywords", "aiRiskLevel", "aiSummary", "arquivoNome", "arquivoPath", "createdAt", "createdByUserId", "descricao", "id", "indexError", "indexStatus", "indexedAt", "status", "titulo", "updatedAt", (SELECT "id" FROM "DocumentAiRequest" WHERE "documentId" = "Document"."id" LIMIT 1) FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_createdByUserId_idx" ON "Document"("createdByUserId");
CREATE INDEX "Document_aiRequestId_idx" ON "Document"("aiRequestId");
CREATE INDEX "Document_status_idx" ON "Document"("status");
CREATE INDEX "Document_indexStatus_idx" ON "Document"("indexStatus");
CREATE TABLE "new_DocumentAiRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "prazo" DATETIME,
    "requestedByUserId" INTEGER NOT NULL,
    "fulfilledByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentAiRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentAiRequest_fulfilledByUserId_fkey" FOREIGN KEY ("fulfilledByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DocumentAiRequest" ("createdAt", "descricao", "fulfilledByUserId", "id", "prazo", "prioridade", "requestedByUserId", "status", "titulo", "updatedAt") SELECT "createdAt", "descricao", "fulfilledByUserId", "id", "prazo", "prioridade", "requestedByUserId", "status", "titulo", "updatedAt" FROM "DocumentAiRequest";
DROP TABLE "DocumentAiRequest";
ALTER TABLE "new_DocumentAiRequest" RENAME TO "DocumentAiRequest";
CREATE INDEX "DocumentAiRequest_requestedByUserId_status_idx" ON "DocumentAiRequest"("requestedByUserId", "status");
CREATE INDEX "DocumentAiRequest_status_prioridade_createdAt_idx" ON "DocumentAiRequest"("status", "prioridade", "createdAt");
CREATE INDEX "DocumentAiRequest_prazo_idx" ON "DocumentAiRequest"("prazo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAiRequestPublicLink_token_key" ON "DocumentAiRequestPublicLink"("token");

-- CreateIndex
CREATE INDEX "DocumentAiRequestPublicLink_requestId_ativo_idx" ON "DocumentAiRequestPublicLink"("requestId", "ativo");

-- CreateIndex
CREATE INDEX "DocumentAiRequestPublicLink_token_ativo_idx" ON "DocumentAiRequestPublicLink"("token", "ativo");

-- CreateIndex
CREATE INDEX "DocumentAiRequestPublicLink_expiraEm_idx" ON "DocumentAiRequestPublicLink"("expiraEm");
