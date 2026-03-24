import bcrypt from "bcryptjs";

import { prisma } from "../../lib/prisma";
import { CreateUserInput, UpdateUserInput } from "./usuarios.schema";

export const listUsers = async () => {
  return prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });
};

export const getUserById = async (id: number) => {
  return prisma.user.findUnique({ where: { id } });
};

export const createUser = async (input: CreateUserInput) => {
  const passwordHash = await bcrypt.hash(input.senha, 10);
  return prisma.user.create({
    data: {
      nome: input.nome.trim(),
      email: input.email.toLowerCase().trim(),
      passwordHash,
      role: input.role
    }
  });
};

export const updateUser = async (id: number, input: UpdateUserInput) => {
  const data: {
    nome?: string;
    email?: string;
    role?: UpdateUserInput["role"];
    passwordHash?: string;
  } = {};

  if (input.nome !== undefined) {
    data.nome = input.nome.trim();
  }
  if (input.email !== undefined) {
    data.email = input.email.toLowerCase().trim();
  }
  if (input.role !== undefined) {
    data.role = input.role;
  }
  if (input.senha !== undefined) {
    data.passwordHash = await bcrypt.hash(input.senha, 10);
  }

  return prisma.user.update({
    where: { id },
    data
  });
};
