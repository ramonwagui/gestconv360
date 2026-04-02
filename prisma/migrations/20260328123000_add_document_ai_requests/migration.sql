-- CreateTable
CREATE TABLE "DocumentAiRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "prazo" DATETIME,
    "requestedByUserId" INTEGER NOT NULL,
    "fulfilledByUserId" INTEGER,
    "documentId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DocumentAiRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DocumentAiRequest_fulfilledByUserId_fkey" FOREIGN KEY ("fulfilledByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DocumentAiRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAiRequest_documentId_key" ON "DocumentAiRequest"("documentId");

-- CreateIndex
CREATE INDEX "DocumentAiRequest_requestedByUserId_status_idx" ON "DocumentAiRequest"("requestedByUserId", "status");

-- CreateIndex
CREATE INDEX "DocumentAiRequest_status_prioridade_createdAt_idx" ON "DocumentAiRequest"("status", "prioridade", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAiRequest_prazo_idx" ON "DocumentAiRequest"("prazo");
