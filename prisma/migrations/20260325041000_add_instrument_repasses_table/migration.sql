-- CreateTable
CREATE TABLE "InstrumentRepasse" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "instrumentId" INTEGER NOT NULL,
    "dataRepasse" DATETIME NOT NULL,
    "valorRepasse" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InstrumentRepasse_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "InstrumentProposal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "InstrumentRepasse_instrumentId_dataRepasse_idx" ON "InstrumentRepasse"("instrumentId", "dataRepasse");
