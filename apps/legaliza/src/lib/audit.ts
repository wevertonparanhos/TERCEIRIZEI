import { prisma, type Prisma } from "@legaliza/db";

/** Registra uma entrada na trilha de auditoria. Nunca deve derrubar a ação
 * que a chamou — falha de log é logada no console, não propagada. */
export async function logAudit(params: {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        metadata: params.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error("[audit] falha ao registrar log:", err);
  }
}
