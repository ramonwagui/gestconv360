import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";

type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token ausente ou invalido." });
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    req.user = {
      id: Number(payload.sub),
      email: payload.email,
      role: payload.role
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Token invalido ou expirado." });
  }
};

export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Usuario nao autenticado." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Usuario sem permissao para esta operacao." });
    }

    return next();
  };
};
