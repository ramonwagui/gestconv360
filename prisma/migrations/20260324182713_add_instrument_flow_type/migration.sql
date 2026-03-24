-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InstrumentProposal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "proposta" TEXT NOT NULL,
    "instrumento" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "valorRepasse" DECIMAL NOT NULL,
    "valorContrapartida" DECIMAL NOT NULL,
    "dataCadastro" DATETIME NOT NULL,
    "dataAssinatura" DATETIME,
    "vigenciaInicio" DATETIME NOT NULL,
    "vigenciaFim" DATETIME NOT NULL,
    "dataPrestacaoContas" DATETIME,
    "dataDou" DATETIME,
    "concedente" TEXT NOT NULL,
    "fluxoTipo" TEXT NOT NULL DEFAULT 'OBRA',
    "status" TEXT NOT NULL DEFAULT 'EM_ELABORACAO',
    "responsavel" TEXT,
    "orgaoExecutor" TEXT,
    "observacoes" TEXT,
    "conveneteId" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstrumentProposal_conveneteId_fkey" FOREIGN KEY ("conveneteId") REFERENCES "Convenete" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_InstrumentProposal" ("ativo", "concedente", "conveneteId", "createdAt", "dataAssinatura", "dataCadastro", "dataDou", "dataPrestacaoContas", "id", "instrumento", "objeto", "observacoes", "orgaoExecutor", "proposta", "responsavel", "status", "updatedAt", "valorContrapartida", "valorRepasse", "vigenciaFim", "vigenciaInicio") SELECT "ativo", "concedente", "conveneteId", "createdAt", "dataAssinatura", "dataCadastro", "dataDou", "dataPrestacaoContas", "id", "instrumento", "objeto", "observacoes", "orgaoExecutor", "proposta", "responsavel", "status", "updatedAt", "valorContrapartida", "valorRepasse", "vigenciaFim", "vigenciaInicio" FROM "InstrumentProposal";
DROP TABLE "InstrumentProposal";
ALTER TABLE "new_InstrumentProposal" RENAME TO "InstrumentProposal";
CREATE UNIQUE INDEX "InstrumentProposal_proposta_key" ON "InstrumentProposal"("proposta");
CREATE UNIQUE INDEX "InstrumentProposal_instrumento_key" ON "InstrumentProposal"("instrumento");
CREATE INDEX "InstrumentProposal_concedente_idx" ON "InstrumentProposal"("concedente");
CREATE INDEX "InstrumentProposal_status_idx" ON "InstrumentProposal"("status");
CREATE INDEX "InstrumentProposal_ativo_idx" ON "InstrumentProposal"("ativo");
CREATE INDEX "InstrumentProposal_vigenciaFim_idx" ON "InstrumentProposal"("vigenciaFim");
CREATE INDEX "InstrumentProposal_conveneteId_idx" ON "InstrumentProposal"("conveneteId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
