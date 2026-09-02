"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { recurringTaskSchema, type RecurringTaskInput } from "@/lib/validations/recurring-task";
import { addInterval } from "@/modules/recurring-tasks/labels";

// A conexão do Prisma bypassa RLS (role postgres) — tenant_id explícito em
// todo where/data abaixo é a real fronteira de isolamento nesta camada.
async function requireManageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR"].includes(user.role)) {
    throw new Error("Você não tem permissão para gerenciar tarefas recorrentes.");
  }
  return user;
}

async function requireStaff(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  return user;
}

export async function createRecurringTask(clientId: string, input: RecurringTaskInput) {
  const user = await requireManageAccess();
  const data = recurringTaskSchema.parse(input);

  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: user.tenantId } });
  if (!client) throw new Error("Cliente não encontrado.");

  const task = await prisma.recurringTask.create({
    data: {
      tenantId: user.tenantId,
      clientId,
      title: data.title,
      assigneeId: data.assigneeId || null,
      frequency: data.frequency,
      nextDueAt: new Date(data.nextDueAt),
      notes: data.notes || null,
    },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "recurring_task.create",
    entityType: "recurring_task",
    entityId: task.id,
    description: `Tarefa recorrente "${data.title}" criada para ${client.name}.`,
  });

  revalidatePath("/tarefas-recorrentes");
  revalidatePath(`/clientes/${clientId}`);
}

export async function updateRecurringTask(taskId: string, input: RecurringTaskInput) {
  const user = await requireManageAccess();
  const data = recurringTaskSchema.parse(input);

  const existing = await prisma.recurringTask.findFirst({ where: { id: taskId, tenantId: user.tenantId } });
  if (!existing) throw new Error("Tarefa recorrente não encontrada.");

  await prisma.recurringTask.update({
    where: { id: taskId },
    data: {
      title: data.title,
      assigneeId: data.assigneeId || null,
      frequency: data.frequency,
      nextDueAt: new Date(data.nextDueAt),
      notes: data.notes || null,
    },
  });

  revalidatePath("/tarefas-recorrentes");
  revalidatePath(`/clientes/${existing.clientId}`);
}

/** Marca a ocorrência atual como concluída e avança nextDueAt pela frequência
 * — a partir do próprio nextDueAt (não de "agora"), pra manter a cadência
 * fixa mesmo se a conclusão atrasar. */
export async function completeRecurringTaskOccurrence(taskId: string) {
  const user = await requireStaff();

  const task = await prisma.recurringTask.findFirst({ where: { id: taskId, tenantId: user.tenantId } });
  if (!task) throw new Error("Tarefa recorrente não encontrada.");

  const newNextDueAt = addInterval(task.nextDueAt, task.frequency);

  await prisma.$transaction([
    prisma.recurringTaskCompletion.create({
      data: { recurringTaskId: taskId, completedById: user.id },
    }),
    prisma.recurringTask.update({
      where: { id: taskId },
      data: { nextDueAt: newNextDueAt },
    }),
  ]);

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "recurring_task.complete",
    entityType: "recurring_task",
    entityId: taskId,
    description: `Ocorrência de "${task.title}" concluída — próxima em ${newNextDueAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}.`,
  });

  revalidatePath("/tarefas-recorrentes");
  revalidatePath(`/clientes/${task.clientId}`);
}

export async function deactivateRecurringTask(taskId: string) {
  const user = await requireManageAccess();

  const result = await prisma.recurringTask.updateMany({
    where: { id: taskId, tenantId: user.tenantId },
    data: { active: false },
  });
  if (result.count === 0) throw new Error("Tarefa recorrente não encontrada.");

  revalidatePath("/tarefas-recorrentes");
}

export async function reactivateRecurringTask(taskId: string) {
  const user = await requireManageAccess();

  const result = await prisma.recurringTask.updateMany({
    where: { id: taskId, tenantId: user.tenantId },
    data: { active: true },
  });
  if (result.count === 0) throw new Error("Tarefa recorrente não encontrada.");

  revalidatePath("/tarefas-recorrentes");
}
