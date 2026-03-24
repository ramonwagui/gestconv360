import { Prisma, UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { createConveneteSchema, updateConveneteSchema } from "./convenetes.schema";
import {
  createConvenete,
  deleteConvenete,
  getConveneteById,
  listConvenetes,
  updateConvenete
} from "./convenetes.service";

const router = Router();

router.use(authenticate);

router.get("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA), async (_req, res) => {
  try {
    const items = await listConvenetes();
    return res.json(
      items.map((item: {
        id: number;
        nome: string;
        cnpj: string;
        endereco: string;
        bairro: string;
        cep: string;
        uf: string;
        cidade: string;
        tel: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
      }) => ({
        id: item.id,
        nome: item.nome,
        cnpj: item.cnpj,
        endereco: item.endereco,
        bairro: item.bairro,
        cep: item.cep,
        uf: item.uf,
        cidade: item.cidade,
        tel: item.tel,
        email: item.email,
        created_at: item.createdAt.toISOString(),
        updated_at: item.updatedAt.toISOString()
      }))
    );
  } catch {
    return res.status(500).json({ message: "Erro interno ao listar convenetes." });
  }
});

router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (req, res) => {
  const parsed = createConveneteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const created = await createConvenete(parsed.data);
    return res.status(201).json({
      id: created.id,
      nome: created.nome,
      cnpj: created.cnpj,
      endereco: created.endereco,
      bairro: created.bairro,
      cep: created.cep,
      uf: created.uf,
      cidade: created.cidade,
      tel: created.tel,
      email: created.email,
      created_at: created.createdAt.toISOString(),
      updated_at: created.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "CNPJ ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao criar convenete." });
  }
});

router.put("/:id", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  const parsed = updateConveneteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const existing = await getConveneteById(id);
    if (!existing) {
      return res.status(404).json({ message: "Convenete nao encontrado." });
    }

    const updated = await updateConvenete(id, parsed.data);
    return res.json({
      id: updated.id,
      nome: updated.nome,
      cnpj: updated.cnpj,
      endereco: updated.endereco,
      bairro: updated.bairro,
      cep: updated.cep,
      uf: updated.uf,
      cidade: updated.cidade,
      tel: updated.tel,
      email: updated.email,
      created_at: updated.createdAt.toISOString(),
      updated_at: updated.updatedAt.toISOString()
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "CNPJ ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao atualizar convenete." });
  }
});

router.delete("/:id", authorizeRoles(UserRole.ADMIN), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  try {
    const existing = await getConveneteById(id);
    if (!existing) {
      return res.status(404).json({ message: "Convenete nao encontrado." });
    }

    await deleteConvenete(id);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Erro interno ao remover convenete." });
  }
});

export { router as convenetesRouter };
