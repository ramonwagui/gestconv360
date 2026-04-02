import { UserRole } from "@prisma/client";
import { Router } from "express";

import { authenticate, authorizeRoles } from "../../middlewares/auth";
import {
  transferenciaDiscricionariaDesembolsoQuerySchema,
  transferenciaDiscricionariaDesembolsoProponenteQuerySchema,
  sugestaoProponentePorCnpjQuerySchema,
  sincronizarTransferenciasDiscricionariasBodySchema,
  transferenciaDiscricionariaQuerySchema
} from "./transferencias-discricionarias.schema";
import {
  listarDesembolsosTransferenciasDiscricionarias,
  listarDesembolsosPorProponenteTransferenciasDiscricionarias,
  listarFiltrosTransferenciasDiscricionarias,
  listarSugestoesProponentePorCnpj,
  listarTransferenciasDiscricionarias,
  obterStatusSincronizacaoTransferenciasDiscricionarias,
  sincronizarTransferenciasDiscricionarias
} from "./transferencias-discricionarias.service";

export const transferenciasDiscricionariasRouter = Router();

transferenciasDiscricionariasRouter.use(authenticate);

transferenciasDiscricionariasRouter.get(
  "/filtros",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (_req, res) => {
    try {
      const filtros = await listarFiltrosTransferenciasDiscricionarias();
      return res.json(filtros);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao consultar filtros de transferencias discricionarias."
      });
    }
  }
);

transferenciasDiscricionariasRouter.get(
  "/proponentes/sugestoes",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = sugestaoProponentePorCnpjQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const itens = await listarSugestoesProponentePorCnpj(parsed.data.cnpj, parsed.data.limit);
      return res.json({ itens });
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao consultar sugestoes de proponentes."
      });
    }
  }
);

transferenciasDiscricionariasRouter.get(
  "/desembolsos/proponente",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = transferenciaDiscricionariaDesembolsoProponenteQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarDesembolsosPorProponenteTransferenciasDiscricionarias(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Falha ao consultar desembolsos de transferencias discricionarias por proponente."
      });
    }
  }
);

transferenciasDiscricionariasRouter.get(
  "/desembolsos",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = transferenciaDiscricionariaDesembolsoQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarDesembolsosTransferenciasDiscricionarias(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao consultar desembolsos de transferencias discricionarias."
      });
    }
  }
);

transferenciasDiscricionariasRouter.get(
  "/propostas",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (req, res) => {
    const parsed = transferenciaDiscricionariaQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await listarTransferenciasDiscricionarias(parsed.data);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        message:
          error instanceof Error
            ? error.message
            : "Falha ao consultar transferencias discricionarias e legais."
      });
    }
  }
);

transferenciasDiscricionariasRouter.get(
  "/sincronizacao",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR, UserRole.CONSULTA),
  async (_req, res) => {
    try {
      const status = await obterStatusSincronizacaoTransferenciasDiscricionarias();
      return res.json(status);
    } catch (error) {
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Falha ao consultar status de sincronizacao."
      });
    }
  }
);

transferenciasDiscricionariasRouter.post(
  "/sincronizar",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR),
  async (req, res) => {
    const parsed = sincronizarTransferenciasDiscricionariasBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(422).json({
        message: "Payload invalido",
        issues: parsed.error.flatten()
      });
    }

    try {
      const result = await sincronizarTransferenciasDiscricionarias(parsed.data.force);
      return res.json(result);
    } catch (error) {
      return res.status(502).json({
        message: error instanceof Error ? error.message : "Falha ao sincronizar transferencias discricionarias."
      });
    }
  }
);
