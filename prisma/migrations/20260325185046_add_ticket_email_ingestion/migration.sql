-- CreateTable
CREATE TABLE "TicketEmailIngestion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gmailMessageId" TEXT NOT NULL,
    "gmailThreadId" TEXT,
    "fromEmail" TEXT NOT NULL,
    "subject" TEXT,
    "receivedAt" DATETIME,
    "statusProcessamento" TEXT NOT NULL,
    "erro" TEXT,
    "payloadRaw" TEXT,
    "ticketId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TicketEmailIngestion_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketEmailIngestion_gmailMessageId_key" ON "TicketEmailIngestion"("gmailMessageId");

-- CreateIndex
CREATE INDEX "TicketEmailIngestion_statusProcessamento_createdAt_idx" ON "TicketEmailIngestion"("statusProcessamento", "createdAt");

-- CreateIndex
CREATE INDEX "TicketEmailIngestion_fromEmail_createdAt_idx" ON "TicketEmailIngestion"("fromEmail", "createdAt");

-- CreateIndex
CREATE INDEX "TicketEmailIngestion_ticketId_idx" ON "TicketEmailIngestion"("ticketId");
