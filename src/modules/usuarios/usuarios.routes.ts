import { Prisma, UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { createUserSchema, updateUserSchema, userIdParamSchema } from "./usuarios.schema";
import { createUser, getUserById, listUsers, updateUser } from "./usuarios.service";

const router = Router();

router.use(authenticate);
router.use(authorizeRoles(UserRole.ADMIN));

const mapUser = (item: Awaited<ReturnType<typeof getUserById>>) => {
  if (!item) {
    return null;
  }

  return {
    id: item.id,
    nome: item.nome,
    email: item.email,
    role: item.role,
    created_at: item.createdAt.toISOString(),
    updated_at: item.updatedAt.toISOString()
  };
};

router.get("/", async (_req, res) => {
  try {
    const items = await listUsers();
    return res.json(items.map((item) => mapUser(item)));
  } catch {
    return res.status(500).json({ message: "Erro interno ao listar usuarios." });
  }
});

router.post("/", async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const created = await createUser(parsed.data);
    return res.status(201).json(mapUser(created));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Email ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao criar usuario." });
  }
});

router.put("/:id", async (req, res) => {
  const idParam = userIdParamSchema.safeParse(req.params);
  if (!idParam.success) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const existing = await getUserById(idParam.data.id);
    if (!existing) {
      return res.status(404).json({ message: "Usuario nao encontrado." });
    }

    const updated = await updateUser(idParam.data.id, parsed.data);
    return res.json(mapUser(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "Email ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao atualizar usuario." });
  }
});

export { router as usuariosRouter };
