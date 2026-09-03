"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";

async function requireWriteAccess() {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

export async function toggleChecklistItem(processId: string, itemId: string, done: boolean) {
  const user = await requireWriteAccess();

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId! } });
  if (!process) throw new Error("Processo não encontrado.");

  await prisma.checklistItem.update({ where: { id: itemId, processId }, data: { done } });
  revalidatePath(`/processos/${processId}`);
}
