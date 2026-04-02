import { Prisma, UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  createConveneteFromProponenteSchema,
  createConveneteSchema,
  proponenteSugestaoQuerySchema,
  updateConveneteSchema
} from "./convenetes.schema";
import {
  createConveneteFromProponente,
  createConvenete,
  deleteConvenete,
  getConveneteById,
  listProponenteSugestoesFromTransferencias,
  listConvenetes,
  reimportarInstrumentosDoProponenteAtendido,
  reimportarInstrumentosTodosProponentesAtendidos,
  updateConvenete
} from "./convenetes.service";

const router = Router();

const mapConveneteResponse = (item: {
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
});

router.use(authenticate);

router.get(
  ["/proponentes/sugestoes", "/sugestoes"],
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = proponenteSugestaoQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const itens = await listProponenteSugestoesFromTransferencias(parsed.data);
      return res.json({ itens });
    } catch {
      return res.status(500).json({ message: "Erro interno ao listar sugestoes de proponentes." });
    }
  }
);

router.post(["/proponentes", "/from-base"], authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (req, res) => {
  const parsed = createConveneteFromProponenteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Payload invalido",
      issues: parsed.error.flatten()
    });
  }

  try {
    const result = await createConveneteFromProponente(parsed.data);
    return res.status(201).json({
      ...mapConveneteResponse(result.proponente),
      importacao: result.importacao
    });
  } catch {
    return res.status(500).json({ message: "Erro interno ao cadastrar proponente." });
  }
});

router.get("/", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA), async (_req, res) => {
  try {
    const items = await listConvenetes();
    return res.json(items.map(mapConveneteResponse));
  } catch {
    return res.status(500).json({ message: "Erro interno ao listar proponentes." });
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
    return res.status(201).json(mapConveneteResponse(created));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "CNPJ ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao criar proponente." });
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
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }

    const updated = await updateConvenete(id, parsed.data);
    return res.json(mapConveneteResponse(updated));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return res.status(409).json({ message: "CNPJ ja cadastrado." });
    }
    return res.status(500).json({ message: "Erro interno ao atualizar proponente." });
  }
});

router.post("/:id(\\d+)/reimportar-instrumentos", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "ID invalido." });
  }

  try {
    const result = await reimportarInstrumentosDoProponenteAtendido(id);
    if (!result) {
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }

    return res.json(result);
  } catch {
    return res.status(500).json({ message: "Erro interno ao reimportar instrumentos do proponente." });
  }
});

router.post("/reimportar-instrumentos-todos", authorizeRoles(UserRole.ADMIN, UserRole.GESTOR), async (_req, res) => {
  try {
    const result = await reimportarInstrumentosTodosProponentesAtendidos();
    return res.json(result);
  } catch {
    return res.status(500).json({ message: "Erro interno ao reimportar instrumentos de todos os proponentes." });
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
      return res.status(404).json({ message: "Proponente nao encontrado." });
    }

    await deleteConvenete(id);
    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Erro interno ao remover proponente." });
  }
});

export { router as convenetesRouter };
