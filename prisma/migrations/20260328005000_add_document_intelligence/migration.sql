-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "documentId" INTEGER NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embeddingVector" TEXT,
    "embeddingModel" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("arquivoNome", "arquivoPath", "createdAt", "createdByUserId", "descricao", "id", "status", "titulo", "updatedAt") SELECT "arquivoNome", "arquivoPath", "createdAt", "createdByUserId", "descricao", "id", "status", "titulo", "updatedAt" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_createdByUserId_idx" ON "Document"("createdByUserId");
CREATE INDEX "Document_status_idx" ON "Document"("status");
CREATE INDEX "Document_indexStatus_idx" ON "Document"("indexStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DocumentChunk_documentId_idx" ON "DocumentChunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentChunk_documentId_chunkIndex_key" ON "DocumentChunk"("documentId", "chunkIndex");
