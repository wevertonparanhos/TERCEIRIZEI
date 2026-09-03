"use server";

import { revalidatePath } from "next/cache";
import { prisma, type ProtocolStatus } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { protocolSchema, type ProtocolInput } from "@/lib/validations/protocol";

async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

export async function createProtocol(processId: string, input: ProtocolInput) {
  const user = await requireWriteAccess();
  const data = protocolSchema.parse(input);

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId! } });
  if (!process) throw new Error("Processo não encontrado.");

  const protocol = await prisma.protocol.create({
    data: {
      tenantId: user.tenantId!,
      processId,
      processStepId: data.processStepId || null,
      governmentAgencyId: data.governmentAgencyId,
      protocolNumber: data.protocolNumber,
      url: data.url || null,
      notes: data.notes || null,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "protocol.create",
    entityType: "process",
    entityId: processId,
    description: `Protocolo "${protocol.protocolNumber}" registrado.`,
  });

  revalidatePath(`/processos/${processId}`);
}

export async function updateProtocolStatus(processId: string, protocolId: string, status: ProtocolStatus) {
  const user = await requireWriteAccess();

  const result = await prisma.protocol.updateMany({
    where: { id: protocolId, processId, tenantId: user.tenantId! },
    data: { status },
  });
  if (result.count === 0) throw new Error("Protocolo não encontrado.");

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "protocol.status_change",
    entityType: "process",
    entityId: processId,
    description: `Status do protocolo alterado para ${status}.`,
  });

  revalidatePath(`/processos/${processId}`);
}
