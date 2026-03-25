-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Ticket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "prioridade" TEXT NOT NULL DEFAULT 'MEDIA',
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "instrumentoInformado" TEXT,
    "instrumentoEncontrado" BOOLEAN NOT NULL DEFAULT true,
    "prazoAlvo" DATETIME,
    "resolvidoEm" DATETIME,
    "motivoResolucao" TEXT,
    "instrumentId" INTEGER,
    "responsavelUserId" INTEGER,
    "createdByUserId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ticket_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_responsavelUserId_fkey" FOREIGN KEY ("responsavelUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Ticket_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Ticket" ("codigo", "createdAt", "createdByUserId", "descricao", "id", "instrumentId", "instrumentoEncontrado", "instrumentoInformado", "origem", "responsavelUserId", "status", "titulo", "updatedAt") SELECT "codigo", "createdAt", "createdByUserId", "descricao", "id", "instrumentId", "instrumentoEncontrado", "instrumentoInformado", "origem", "responsavelUserId", "status", "titulo", "updatedAt" FROM "Ticket";
DROP TABLE "Ticket";
ALTER TABLE "new_Ticket" RENAME TO "Ticket";
CREATE UNIQUE INDEX "Ticket_codigo_key" ON "Ticket"("codigo");
CREATE INDEX "Ticket_status_idx" ON "Ticket"("status");
CREATE INDEX "Ticket_origem_idx" ON "Ticket"("origem");
CREATE INDEX "Ticket_instrumentId_idx" ON "Ticket"("instrumentId");
CREATE INDEX "Ticket_responsavelUserId_idx" ON "Ticket"("responsavelUserId");
CREATE INDEX "Ticket_createdByUserId_idx" ON "Ticket"("createdByUserId");
CREATE INDEX "Ticket_createdAt_idx" ON "Ticket"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
