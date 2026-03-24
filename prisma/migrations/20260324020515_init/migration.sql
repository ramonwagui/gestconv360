-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CONSULTA',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InstrumentProposal" (
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
    "status" TEXT NOT NULL DEFAULT 'EM_ELABORACAO',
    "responsavel" TEXT,
    "orgaoExecutor" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentProposal_proposta_key" ON "InstrumentProposal"("proposta");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentProposal_instrumento_key" ON "InstrumentProposal"("instrumento");

-- CreateIndex
CREATE INDEX "InstrumentProposal_concedente_idx" ON "InstrumentProposal"("concedente");

-- CreateIndex
CREATE INDEX "InstrumentProposal_status_idx" ON "InstrumentProposal"("status");

-- CreateIndex
CREATE INDEX "InstrumentProposal_ativo_idx" ON "InstrumentProposal"("ativo");

-- CreateIndex
CREATE INDEX "InstrumentProposal_vigenciaFim_idx" ON "InstrumentProposal"("vigenciaFim");
