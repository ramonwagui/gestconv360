-- AlterTable
ALTER TABLE "InstrumentProposal" ADD COLUMN "valorJaRepassado" DECIMAL NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "InstrumentProposal" ADD COLUMN "dataRepasse1" DATETIME;

-- AlterTable
ALTER TABLE "InstrumentProposal" ADD COLUMN "dataRepasse2" DATETIME;
