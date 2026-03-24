-- CreateTable
CREATE TABLE "Convenete" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "bairro" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "uf" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "tel" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Convenete_cnpj_key" ON "Convenete"("cnpj");

-- CreateIndex
CREATE INDEX "Convenete_nome_idx" ON "Convenete"("nome");

-- CreateIndex
CREATE INDEX "Convenete_cidade_idx" ON "Convenete"("cidade");
