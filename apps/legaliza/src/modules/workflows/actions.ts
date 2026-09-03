"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { workflowSchema, workflowStepSchema, type WorkflowInput, type WorkflowStepInput } from "@/lib/validations/workflow";
import { ruleSchema, type RuleInput } from "@/lib/validations/rule";

// Configuração (Workflow/WorkflowStep/Rule) é decisão de como o escritório
// opera, não trabalho do dia a dia — só TENANT_ADMIN mexe.
async function requireAdmin(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN");
}

async function requireOwnWorkflow(tenantId: string, workflowId: string) {
  const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, tenantId }, select: { id: true } });
  if (!workflow) throw new Error("Workflow não encontrado.");
}

export async function createWorkflow(input: WorkflowInput) {
  const user = await requireAdmin();
  const data = workflowSchema.parse(input);

  const workflow = await prisma.workflow.create({
    data: {
      tenantId: user.tenantId!,
      name: data.name,
      processType: data.processType,
      state: data.state ? data.state.toUpperCase() : null,
      legalNature: data.legalNature || null,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "workflow.create",
    entityType: "workflow",
    entityId: workflow.id,
    description: `Workflow "${workflow.name}" criado.`,
  });

  revalidatePath("/workflows");
  return { id: workflow.id };
}

export async function addWorkflowStep(workflowId: string, input: WorkflowStepInput) {
  const user = await requireAdmin();
  await requireOwnWorkflow(user.tenantId!, workflowId);
  const data = workflowStepSchema.parse(input);

  const lastStep = await prisma.workflowStep.findFirst({ where: { workflowId }, orderBy: { order: "desc" } });

  await prisma.workflowStep.create({
    data: {
      workflowId,
      name: data.name,
      description: data.description || null,
      order: (lastStep?.order ?? 0) + 1,
      estimatedDays: data.estimatedDays ?? null,
      responsibleRole: data.responsibleRole || null,
      agencyName: data.agencyName || null,
      requiresDocument: data.requiresDocument,
      requiresProtocol: data.requiresProtocol,
      isAutomated: data.isAutomated,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "workflow_step.add",
    entityType: "workflow",
    entityId: workflowId,
    description: `Etapa "${data.name}" adicionada ao workflow.`,
  });

  revalidatePath(`/workflows/${workflowId}`);
}

export async function deleteWorkflowStep(workflowId: string, stepId: string) {
  const user = await requireAdmin();
  await requireOwnWorkflow(user.tenantId!, workflowId);

  await prisma.workflowStep.delete({ where: { id: stepId, workflowId } });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "workflow_step.remove",
    entityType: "workflow",
    entityId: workflowId,
    description: "Etapa removida do workflow.",
  });

  revalidatePath(`/workflows/${workflowId}`);
}

export async function createRule(input: RuleInput) {
  const user = await requireAdmin();
  const data = ruleSchema.parse(input);
  await requireOwnWorkflow(user.tenantId!, data.workflowId);

  await prisma.rule.create({
    data: {
      tenantId: user.tenantId!,
      name: data.name,
      processType: data.processType,
      state: data.state ? data.state.toUpperCase() : null,
      legalNature: data.legalNature || null,
      workflowId: data.workflowId,
      priority: data.priority,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "rule.create",
    entityType: "rule",
    description: `Regra "${data.name}" criada.`,
  });

  revalidatePath("/workflows/regras");
}

export async function deleteRule(ruleId: string) {
  const user = await requireAdmin();

  await prisma.rule.deleteMany({ where: { id: ruleId, tenantId: user.tenantId! } });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "rule.remove",
    entityType: "rule",
    entityId: ruleId,
    description: "Regra removida.",
  });

  revalidatePath("/workflows/regras");
}
