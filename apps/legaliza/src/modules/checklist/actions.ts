"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

async function requireWriteAccess() {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

export async function toggleChecklistItem(processId: string, itemId: string, done: boolean) {
  const user = await requireWriteAccess();

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId! } });
  if (!process) throw new Error("Processo não encontrado.");

  const item = await prisma.checklistItem.update({ where: { id: itemId, processId }, data: { done } });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "checklist_item.toggle",
    entityType: "process",
    entityId: processId,
    description: `Item de checklist "${item.label}" marcado como ${done ? "concluído" : "pendente"}.`,
  });

  revalidatePath(`/processos/${processId}`);
}
