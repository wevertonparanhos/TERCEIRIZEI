"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { amendmentSchema, type AmendmentInput } from "@/lib/validations/amendment";
import { resolveWorkflow, generateProcessSteps, generateChecklist } from "./workflow-engine";

async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

/** Processo de Alteração (seção 54 do briefing): não duplica os formulários
 * de edição que já existem em /empresas/[id] — só cria o processo e um
 * ChecklistItem por aspecto marcado, pra o operador rastrear o que falta
 * atualizar (a edição de verdade acontece na tela da empresa). */
export async function createAmendmentProcess(input: AmendmentInput) {
  const user = await requireWriteAccess();
  const data = amendmentSchema.parse(input);

  const company = await prisma.company.findFirst({
    where: { id: data.companyId, tenantId: user.tenantId!, clientId: data.clientId },
  });
  if (!company) throw new Error("Empresa não encontrada para este cliente.");

  const startedAt = new Date();
  const workflowId = await resolveWorkflow(user.tenantId!, {
    processType: "AMENDMENT",
    state: data.state.toUpperCase(),
    legalNature: company.legalNature,
  });

  const process = await prisma.process.create({
    data: {
      tenantId: user.tenantId!,
      clientId: data.clientId,
      companyId: data.companyId,
      workflowId,
      type: "AMENDMENT",
      priority: data.priority,
      state: data.state.toUpperCase(),
      municipality: data.municipality,
      startedAt,
    },
  });

  const stepsGenerated = workflowId ? await generateProcessSteps(process.id, workflowId, startedAt) : 0;
  if (workflowId) await generateChecklist(process.id, workflowId);

  await prisma.checklistItem.createMany({
    data: data.aspects.map((aspect) => ({
      processId: process.id,
      label: `Atualizar: ${aspect}`,
      required: true,
    })),
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "process.create",
    entityType: "process",
    entityId: process.id,
    description: `Processo de alteração criado para "${company.legalName}" (${data.aspects.join(", ")}).`,
  });

  revalidatePath("/processos");
  return { id: process.id, stepsGenerated };
}
