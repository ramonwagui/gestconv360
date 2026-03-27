-- CreateTable
CREATE TABLE "InstrumentSolicitacaoCaixa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instrumentId" INTEGER NOT NULL,
    "ticketId" INTEGER,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "origemEmail" TEXT,
    "assuntoEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InstrumentSolicitacaoCaixa_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InstrumentSolicitacaoCaixa_instrumentId_createdAt_idx" ON "InstrumentSolicitacaoCaixa"("instrumentId", "createdAt");

-- CreateIndex
CREATE INDEX "InstrumentSolicitacaoCaixa_ticketId_idx" ON "InstrumentSolicitacaoCaixa"("ticketId");
