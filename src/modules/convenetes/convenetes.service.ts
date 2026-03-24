import { prisma } from "../../lib/prisma";

import { CreateConveneteInput, UpdateConveneteInput } from "./convenetes.schema";

export const createConvenete = async (input: CreateConveneteInput) => {
  return prisma.convenete.create({
    data: {
      nome: input.nome,
      cnpj: input.cnpj,
      endereco: input.endereco,
      bairro: input.bairro,
      cep: input.cep,
      uf: input.uf,
      cidade: input.cidade,
      tel: input.tel,
      email: input.email
    }
  });
};

export const listConvenetes = async () => {
  return prisma.convenete.findMany({
    orderBy: [{ nome: "asc" }, { id: "asc" }]
  });
};

export const getConveneteById = async (id: number) => {
  return prisma.convenete.findUnique({ where: { id } });
};

export const updateConvenete = async (id: number, input: UpdateConveneteInput) => {
  return prisma.convenete.update({
    where: { id },
    data: {
      nome: input.nome,
      cnpj: input.cnpj,
      endereco: input.endereco,
      bairro: input.bairro,
      cep: input.cep,
      uf: input.uf,
      cidade: input.cidade,
      tel: input.tel,
      email: input.email
    }
  });
};

export const deleteConvenete = async (id: number) => {
  return prisma.convenete.delete({ where: { id } });
};
