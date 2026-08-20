"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  processSchema,
  taskSchema,
  createProcessSchema,
  clientCreateProcessSchema,
  TASK_STATUSES,
  type ProcessInput,
  type TaskInput,
  type CreateProcessInput,
  type ClientCreateProcessInput,
} from "@/lib/validations/process";

type TaskStatusValue = (typeof TASK_STATUSES)[number];

// A conexão do Prisma bypassa RLS (role postgres) — tenant_id/process_id explícitos
// em todo where/data abaixo são a real fronteira de isolamento nesta camada.
async function requireStaff(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  return user;
}

async function requireManageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR"].includes(user.role)) {
    throw new Error("Você não tem permissão para esta ação.");
  }
  return user;
}

async function loadProcessForWrite(processId: string, user: CurrentUser) {
  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId } });
  if (!process) throw new Error("Processo não encontrado.");
  if (user.role === "OPERACIONAL" && process.assignedUserId !== user.id) {
    throw new Error("Você só pode alterar processos atribuídos a você.");
  }
  if (user.role === "FINANCEIRO") throw new Error("Financeiro tem acesso somente leitura a processos.");
  return process;
}

async function nextProcessNumber(tenantId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    insert into tenant_counters (tenant_id, key, value)
    values (${tenantId}::uuid, 'process', 1)
    on conflict (tenant_id, key) do update set value = tenant_counters.value + 1
    returning value
  `;
  return rows[0].value;
}

/** Abre um processo direto — antes existia um passo intermediário de
 * "demanda", removido na fusão Demanda/Processo. Já nasce na primeira etapa
 * do Kanban do tenant. */
export async function createProcess(input: CreateProcessInput) {
  const user = await requireManageAccess();
  const data = createProcessSchema.parse(input);

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!client) throw new Error("Cliente não encontrado.");

  const firstStage = await prisma.kanbanStage.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { position: "asc" },
  });
  if (!firstStage) throw new Error("Nenhuma etapa de Kanban configurada para este tenant.");

  const number = await nextProcessNumber(user.tenantId);

  const process = await prisma.process.create({
    data: {
      tenantId: user.tenantId,
      number,
      clientId: data.clientId,
      companyId: data.companyId || null,
      serviceTypeId: data.serviceTypeId,
      stageId: firstStage.id,
      description: data.description,
      priority: data.priority,
      value: data.value ? Number(data.value) : null,
      requestedDeadline: data.requestedDeadline ? new Date(data.requestedDeadline) : null,
      notes: data.notes || null,
    },
  });

  await prisma.processStage.create({
    data: { processId: process.id, fromStageId: null, toStageId: firstStage.id, userId: user.id },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "process.create",
    entityType: "process",
    entityId: process.id,
    description: `Processo #${process.number} aberto.`,
  });

  revalidatePath("/processos");
  return { id: process.id };
}

/** Cliente abrindo processo pelo Portal — clientId vem da sessão, nunca do formulário. */
export async function clientCreateProcess(input: ClientCreateProcessInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENTE" || !user.clientId) throw new Error("Acesso negado.");

  const data = clientCreateProcessSchema.parse(input);

  if (data.companyId) {
    const company = await prisma.company.findFirst({ where: { id: data.companyId, clientId: user.clientId } });
    if (!company) throw new Error("Empresa não encontrada.");
  }

  const firstStage = await prisma.kanbanStage.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { position: "asc" },
  });
  if (!firstStage) throw new Error("Nenhuma etapa de Kanban configurada para este tenant.");

  const number = await nextProcessNumber(user.tenantId);

  const process = await prisma.process.create({
    data: {
      tenantId: user.tenantId,
      number,
      clientId: user.clientId,
      companyId: data.companyId || null,
      serviceTypeId: data.serviceTypeId,
      stageId: firstStage.id,
      description: data.description,
      priority: data.priority,
      requestedDeadline: data.requestedDeadline ? new Date(data.requestedDeadline) : null,
      notes: data.notes || null,
    },
  });

  await prisma.processStage.create({
    data: { processId: process.id, fromStageId: null, toStageId: firstStage.id, userId: user.id },
  });

  revalidatePath("/portal");
  revalidatePath("/portal/processos");
  return { id: process.id };
}

export async function updateProcessStage(processId: string, toStageId: string) {
  const user = await requireStaff();
  const process = await loadProcessForWrite(processId, user);

  const stage = await prisma.kanbanStage.findFirst({ where: { id: toStageId, tenantId: user.tenantId } });
  if (!stage) throw new Error("Etapa não encontrada.");

  if (process.stageId === toStageId) return;

  await prisma.$transaction([
    prisma.process.update({ where: { id: processId }, data: { stageId: toStageId } }),
    prisma.processStage.create({
      data: { processId, fromStageId: process.stageId, toStageId, userId: user.id },
    }),
  ]);

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "process.stage_change",
    entityType: "process",
    entityId: processId,
    description: `Processo #${process.number} mudou de etapa.`,
    metadata: { fromStageId: process.stageId, toStageId },
  });

  revalidatePath("/processos");
  revalidatePath(`/processos/${processId}`);
}

export async function updateProcess(processId: string, input: ProcessInput) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);
  const data = processSchema.parse(input);

  await prisma.process.update({
    where: { id: processId },
    data: {
      assignedUserId: data.assignedUserId || null,
      priority: data.priority,
      value: data.value ? Number(data.value) : null,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      notes: data.notes || null,
    },
  });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
}

export async function createTask(processId: string, input: TaskInput) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);
  const data = taskSchema.parse(input);

  await prisma.task.create({
    data: {
      processId,
      title: data.title,
      assigneeId: data.assigneeId || null,
      priority: data.priority,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      notes: data.notes || null,
    },
  });

  revalidatePath(`/processos/${processId}`);
}

export async function updateTaskStatus(processId: string, taskId: string, status: TaskStatusValue) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);

  await prisma.task.update({
    where: { id: taskId, processId },
    data: { status, completedAt: status === "CONCLUIDA" ? new Date() : null },
  });

  revalidatePath(`/processos/${processId}`);
}

export async function deleteTask(processId: string, taskId: string) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);
  await prisma.task.delete({ where: { id: taskId, processId } });
  revalidatePath(`/processos/${processId}`);
}

export async function addChecklistItem(processId: string, label: string) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);
  if (!label.trim()) throw new Error("Informe o item do checklist.");

  await prisma.processChecklistItem.create({ data: { processId, label: label.trim() } });
  revalidatePath(`/processos/${processId}`);
}

export async function toggleChecklistItem(processId: string, itemId: string, done: boolean) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);

  await prisma.processChecklistItem.update({ where: { id: itemId, processId }, data: { done } });
  revalidatePath(`/processos/${processId}`);
}

export async function deleteChecklistItem(processId: string, itemId: string) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);

  await prisma.processChecklistItem.delete({ where: { id: itemId, processId } });
  revalidatePath(`/processos/${processId}`);
}

// --- Gestão das etapas (colunas) do Kanban ---

export async function createStage(label: string) {
  const user = await requireManageAccess();
  if (!label.trim()) throw new Error("Informe o nome da etapa.");

  const last = await prisma.kanbanStage.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { position: "desc" },
  });

  await prisma.kanbanStage.create({
    data: { tenantId: user.tenantId, label: label.trim(), position: (last?.position ?? 0) + 1 },
  });

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
}

export async function renameStage(stageId: string, label: string) {
  const user = await requireManageAccess();
  if (!label.trim()) throw new Error("Informe o nome da etapa.");

  const result = await prisma.kanbanStage.updateMany({
    where: { id: stageId, tenantId: user.tenantId },
    data: { label: label.trim() },
  });
  if (result.count === 0) throw new Error("Etapa não encontrada.");

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
}

export async function deleteStage(stageId: string) {
  const user = await requireManageAccess();

  const stage = await prisma.kanbanStage.findFirst({ where: { id: stageId, tenantId: user.tenantId } });
  if (!stage) throw new Error("Etapa não encontrada.");

  const inUse = await prisma.process.count({ where: { stageId } });
  if (inUse > 0) throw new Error(`Existem ${inUse} processo(s) nesta etapa — mova-os antes de excluir.`);

  await prisma.kanbanStage.delete({ where: { id: stageId } });

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
}

async function swapStagePositions(stageAId: string, stageBId: string) {
  const [a, b] = await Promise.all([
    prisma.kanbanStage.findUniqueOrThrow({ where: { id: stageAId } }),
    prisma.kanbanStage.findUniqueOrThrow({ where: { id: stageBId } }),
  ]);

  await prisma.$transaction([
    prisma.kanbanStage.update({ where: { id: a.id }, data: { position: -1 } }),
    prisma.kanbanStage.update({ where: { id: b.id }, data: { position: a.position } }),
    prisma.kanbanStage.update({ where: { id: a.id }, data: { position: b.position } }),
  ]);
}

export async function moveStage(stageId: string, direction: "up" | "down") {
  const user = await requireManageAccess();

  const stages = await prisma.kanbanStage.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { position: "asc" },
  });
  const index = stages.findIndex((s) => s.id === stageId);
  if (index === -1) throw new Error("Etapa não encontrada.");

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= stages.length) return;

  await swapStagePositions(stages[index].id, stages[targetIndex].id);

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
}

// --- Comentários (equipe + cliente, integrado ao Portal) ---

export async function addProcessComment(processId: string, body: string) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  if (!body.trim()) throw new Error("Escreva um comentário.");

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId } });
  if (!process) throw new Error("Processo não encontrado.");

  await prisma.processComment.create({ data: { processId, authorId: user.id, body: body.trim() } });

  revalidatePath(`/processos/${processId}`);
  revalidatePath(`/portal/processos/${processId}`);
}

/** Cliente comentando no próprio processo, pelo Portal. */
export async function clientAddProcessComment(processId: string, body: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENTE" || !user.clientId) throw new Error("Acesso negado.");
  if (!body.trim()) throw new Error("Escreva um comentário.");

  const process = await prisma.process.findFirst({ where: { id: processId, clientId: user.clientId } });
  if (!process) throw new Error("Processo não encontrado.");

  await prisma.processComment.create({ data: { processId, authorId: user.id, body: body.trim() } });

  revalidatePath(`/portal/processos/${processId}`);
  revalidatePath(`/processos/${processId}`);
}
