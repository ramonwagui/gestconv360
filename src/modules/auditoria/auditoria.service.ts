import { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import { ListAuditQueryInput } from "./auditoria.schema";

export type AuditSnapshot = Record<string, Prisma.JsonValue | null>;

type CreateAuditLogInput = {
  instrumentId: number;
  userId?: number;
  userEmail: string;
  action: AuditAction;
  beforeData?: AuditSnapshot;
  afterData?: AuditSnapshot;
  changedFields?: string[];
};

export const createAuditLog = async (input: CreateAuditLogInput) => {
  return prisma.auditLog.create({
    data: {
      instrumentId: input.instrumentId,
      userId: input.userId,
      userEmail: input.userEmail,
      action: input.action,
      changedFields: input.changedFields,
      beforeData: input.beforeData,
      afterData: input.afterData
    }
  });
};

export const listAuditLogs = async (query: ListAuditQueryInput) => {
  return prisma.auditLog.findMany({
    where: {
      instrumentId: query.instrumento_id,
      action: query.acao
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limite
  });
};

export const diffChangedFields = (
  beforeData: AuditSnapshot | undefined,
  afterData: AuditSnapshot | undefined
): string[] => {
  if (!beforeData || !afterData) {
    return [];
  }

  const keys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)]);
  return [...keys].filter((key) => JSON.stringify(beforeData[key]) !== JSON.stringify(afterData[key]));
};
