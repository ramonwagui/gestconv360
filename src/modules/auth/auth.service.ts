import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { LoginInput, RegisterInput } from "./auth.schema";

const TOKEN_TYPE = "Bearer";

type TokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

const signToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
};

export const registerUser = async (input: RegisterInput) => {
  const passwordHash = await bcrypt.hash(input.senha, 10);

  const user = await prisma.user.create({
    data: {
      nome: input.nome,
      email: input.email.toLowerCase().trim(),
      passwordHash,
      role: input.role
    }
  });

  const accessToken = signToken({
    sub: String(user.id),
    email: user.email,
    role: user.role
  });

  return {
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role
    },
    token_type: TOKEN_TYPE,
    access_token: accessToken
  };
};

export const loginUser = async (input: LoginInput) => {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(input.senha, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  const accessToken = signToken({
    sub: String(user.id),
    email: user.email,
    role: user.role
  });

  return {
    user: {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role
    },
    token_type: TOKEN_TYPE,
    access_token: accessToken
  };
};
