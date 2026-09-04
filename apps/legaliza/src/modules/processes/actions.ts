"use server";

import { revalidatePath } from "next/cache";
import { prisma, type ProcessStatus, type ProcessStepStatus } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { processSchema, type ProcessInput } from "@/lib/validations/process";
import { resolveWorkflow, generateProcessSteps, generateChecklist } from "./workflow-engine";

// A conexão do Prisma usa a role postgres do Supabase (bypassa RLS) — tenant_id
// explícito em todo where/data abaixo é a real fronteira de isolamento nesta
// camada, não a RLS (mesmo padrão documentado no Terceirizei OS).
async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

export async function createProcess(input: ProcessInput) {
  const user = await requireWriteAccess();
  const data = processSchema.parse(input);

  const client = await prisma.client.findFirst({ where: { id: data.clientId, tenantId: user.tenantId! } });
  if (!client) throw new Error("Cliente não encontrado.");

  let legalNature: string | null = null;
  let previousLegalNature: string | null = null;
  if (data.companyId) {
    const company = await prisma.company.findFirst({
      where: { id: data.companyId, tenantId: user.tenantId!, clientId: data.clientId },
    });
    if (!company) throw new Error("Empresa não encontrada para este cliente.");
    legalNature = company.legalNature;
    previousLegalNature = company.legalNature;
  }

  const startedAt = new Date();
  const workflowId = await resolveWorkflow(user.tenantId!, { processType: data.type, state: data.state, legalNature });

  const process = await prisma.process.create({
    data: {
      tenantId: user.tenantId!,
      clientId: data.clientId,
      companyId: data.companyId || null,
      workflowId,
      type: data.type,
      priority: data.priority,
      state: data.state.toUpperCase(),
      municipality: data.municipality,
      startedAt,
    },
  });

  const stepsGenerated = workflowId ? await generateProcessSteps(process.id, workflowId, startedAt) : 0;
  if (workflowId) await generateChecklist(process.id, workflowId);

  // Transformação societária: a mudança de natureza jurídica já é aplicada
  // ao criar o processo (mesma lógica de "já decidiu, agora está
  // registrando" usada na Alteração) — não fica pendente até o processo
  // concluir, diferente da Baixa (ver updateProcessStatus).
  if (data.type === "TRANSFORMATION" && data.desiredLegalNature && data.companyId) {
    await prisma.company.update({
      where: { id: data.companyId },
      data: { legalNature: data.desiredLegalNature },
    });
    await prisma.checklistItem.create({
      data: {
        processId: process.id,
        label: `Transformação: ${previousLegalNature ?? "não informada"} → ${data.desiredLegalNature}`,
        required: true,
      },
    });
  }

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "process.create",
    entityType: "process",
    entityId: process.id,
    description: `Processo de ${data.type} criado (${stepsGenerated} etapa(s)).`,
  });

  revalidatePath("/processos");
  return { id: process.id, stepsGenerated };
}

export async function updateProcessStatus(processId: string, status: ProcessStatus) {
  const user = await requireWriteAccess();

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId! } });
  if (!process) throw new Error("Processo não encontrado.");

  await prisma.process.update({
    where: { id: processId },
    data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "process.status_change",
    entityType: "process",
    entityId: processId,
    description: `Status do processo alterado para ${status}.`,
  });

  // Baixa: a empresa só é marcada inativa quando o processo de fato conclui
  // — ela continua ativa (e operando) durante todo o trâmite de fechamento,
  // diferente de Alteração/Transformação, onde a mudança já vale ao criar.
  if (process.type === "CLOSURE" && status === "COMPLETED" && process.companyId) {
    await prisma.company.update({ where: { id: process.companyId }, data: { status: "inativa" } });
    await logAudit({
      tenantId: user.tenantId!,
      userId: user.id,
      action: "company.closed",
      entityType: "company",
      entityId: process.companyId,
      description: "Empresa marcada como inativa (baixa concluída).",
    });
  }

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
  revalidatePath("/empresas");
}

export async function updateProcessStepStatus(processId: string, stepId: string, status: ProcessStepStatus) {
  const user = await requireWriteAccess();

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId! } });
  if (!process) throw new Error("Processo não encontrado.");

  await prisma.processStep.update({
    where: { id: stepId, processId },
    data: {
      status,
      startedAt: status === "IN_PROGRESS" ? new Date() : undefined,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "process_step.status_change",
    entityType: "process",
    entityId: processId,
    description: `Status de etapa alterado para ${status}.`,
  });

  revalidatePath(`/processos/${processId}`);
}
