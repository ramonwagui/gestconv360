import { Prisma } from "@prisma/client";
import { Router } from "express";

import { loginSchema, registerSchema } from "./auth.schema";
import { loginUser, registerUser } from "./auth.service";

const router = Router();

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const auth = await registerUser(parsed.data);
    return res.status(201).json(auth);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Email ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao registrar usuario." });
  }
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  const auth = await loginUser(parsed.data);
  if (!auth) {
    return res.status(401).json({ message: "Credenciais invalidas." });
  }

  return res.json(auth);
});

export { router as authRouter };
