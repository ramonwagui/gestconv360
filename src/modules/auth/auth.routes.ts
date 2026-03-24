import { Router } from "express";

import { loginSchema } from "./auth.schema";
import { loginUser } from "./auth.service";

const router = Router();

router.post("/register", async (_req, res) => {
  return res.status(403).json({
    message: "Cadastro publico desabilitado. Solicite criacao de usuario ao administrador."
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const auth = await loginUser(parsed.data);
    if (!auth) {
      return res.status(401).json({ message: "Credenciais invalidas." });
    }

    return res.json(auth);
  } catch {
    return res.status(500).json({ message: "Erro interno ao autenticar usuario." });
  }
});

export { router as authRouter };
