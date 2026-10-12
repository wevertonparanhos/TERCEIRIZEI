import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
};

/**
 * Registra ação sensível (quem, quando, o quê, em qual entidade). Recebe o
 * client da transação para gravar junto com a mudança: ou os dois são
 * gravados, ou nenhum.
 */
export async function audit(entry: AuditEntry, tx: Prisma.TransactionClient = db) {
  await tx.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      description: entry.description,
      metadata: entry.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
