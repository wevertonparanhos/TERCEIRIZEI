"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  processSchema,
  createProcessSchema,
  clientCreateProcessSchema,
  type ProcessInput,
  type CreateProcessInput,
  type ClientCreateProcessInput,
} from "@/lib/validations/process";
import { addDays } from "@/modules/processes/labels";
import { sendEmail } from "@/lib/email";
import { syncInvoicesAfterInstallmentChange } from "@/modules/finance/sync";
import { deliverableRespondedEmail } from "@/lib/email-templates";

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
  const process = await prisma.process.findFirst({
    where: { id: processId, tenantId: user.tenantId },
    include: { assignees: { select: { userId: true } } },
  });
  if (!process) throw new Error("Tarefa não encontrada.");
  if (user.role === "OPERACIONAL" && !process.assignees.some((a) => a.userId === user.id)) {
    throw new Error("Você só pode alterar tarefas atribuídas a você.");
  }
  if (user.role === "FINANCEIRO") throw new Error("Financeiro tem acesso somente leitura a tarefas.");
  return process;
}

/** Copia o checklist padrão do modelo de serviço pro processo recém-aberto —
 * é uma cópia (não referência), então cada processo pode editar livremente
 * sem afetar o modelo. */
async function seedChecklistFromTemplate(processId: string, serviceTypeId: string) {
  const templateItems = await prisma.serviceChecklistTemplateItem.findMany({
    where: { serviceTypeId },
    orderBy: { position: "asc" },
  });
  if (templateItems.length === 0) return;

  await prisma.processChecklistItem.createMany({
    data: templateItems.map((item) => ({ processId, label: item.label, category: item.category })),
  });
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

  const workspace = await prisma.workspace.findFirst({
    where: { id: data.workspaceId, tenantId: user.tenantId },
  });
  if (!workspace) throw new Error("Área de trabalho não encontrada.");

  const serviceType = await prisma.serviceType.findFirst({
    where: { id: data.serviceTypeId, tenantId: user.tenantId },
  });
  if (!serviceType) throw new Error("Tipo de serviço não encontrado.");

  const firstStage = data.stageId
    ? await prisma.kanbanStage.findFirst({ where: { id: data.stageId, workspaceId: workspace.id } })
    : await prisma.kanbanStage.findFirst({ where: { workspaceId: workspace.id }, orderBy: { position: "asc" } });
  if (!firstStage) throw new Error("Nenhuma etapa de Kanban configurada para esta área de trabalho.");

  const number = await nextProcessNumber(user.tenantId);

  const process = await prisma.process.create({
    data: {
      tenantId: user.tenantId,
      workspaceId: workspace.id,
      number,
      clientId: data.clientId,
      companyId: data.companyId || null,
      serviceTypeId: data.serviceTypeId,
      stageId: firstStage.id,
      description: data.description,
      priority: data.priority,
      requestedDeadline: data.requestedDeadline
        ? new Date(data.requestedDeadline)
        : serviceType.defaultDeadlineDays
          ? addDays(new Date(), serviceType.defaultDeadlineDays)
          : null,
      notes: data.notes || serviceType.defaultNotes || null,
      dueAt: data.dueAt ? new Date(data.dueAt) : null,
      plannedStartAt: data.plannedStartAt ? new Date(data.plannedStartAt) : null,
      plannedDeliveryAt: data.plannedDeliveryAt ? new Date(data.plannedDeliveryAt) : null,
      // Tarefas criadas pela equipe nascem só para a equipe; o botão "Visível no portal" libera ao cliente.
      visibleInPortal: false,
    },
  });

  await prisma.processStage.create({
    data: { processId: process.id, fromStageId: null, toStageId: firstStage.id, userId: user.id },
  });

  if (data.checklist) {
    if (data.checklist.length > 0) {
      await prisma.processChecklistItem.createMany({
        data: data.checklist.map((label) => ({ processId: process.id, label })),
      });
    }
  } else {
    await seedChecklistFromTemplate(process.id, data.serviceTypeId);
  }

  const initialValue = data.value ? Number(data.value) : serviceType.defaultPrice ? Number(serviceType.defaultPrice) : null;
  if (initialValue) {
    await prisma.processInstallment.create({
      data: {
        processId: process.id,
        position: 1,
        value: initialValue,
        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null,
      },
    });
  }

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "process.create",
    entityType: "process",
    entityId: process.id,
    description: `Tarefa #${process.number} aberta.`,
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

  const serviceType = await prisma.serviceType.findFirst({
    where: { id: data.serviceTypeId, tenantId: user.tenantId },
  });
  if (!serviceType) throw new Error("Tipo de serviço não encontrado.");

  // Cliente não escolhe área de trabalho — processo aberto pelo portal sempre
  // cai na primeira área do tenant (normalmente "Principal").
  const workspace = await prisma.workspace.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { position: "asc" },
  });
  if (!workspace) throw new Error("Nenhuma área de trabalho configurada para este tenant.");

  const firstStage = await prisma.kanbanStage.findFirst({
    where: { workspaceId: workspace.id },
    orderBy: { position: "asc" },
  });
  if (!firstStage) throw new Error("Nenhuma etapa de Kanban configurada para este tenant.");

  const number = await nextProcessNumber(user.tenantId);

  const process = await prisma.process.create({
    data: {
      tenantId: user.tenantId,
      workspaceId: workspace.id,
      number,
      clientId: user.clientId,
      companyId: data.companyId || null,
      serviceTypeId: data.serviceTypeId,
      stageId: firstStage.id,
      description: data.description,
      priority: data.priority,
      requestedDeadline: data.requestedDeadline
        ? new Date(data.requestedDeadline)
        : serviceType.defaultDeadlineDays
          ? addDays(new Date(), serviceType.defaultDeadlineDays)
          : null,
      notes: data.notes || serviceType.defaultNotes || null,
      requestedByClient: true,
    },
  });

  await prisma.processStage.create({
    data: { processId: process.id, fromStageId: null, toStageId: firstStage.id, userId: user.id },
  });

  await seedChecklistFromTemplate(process.id, data.serviceTypeId);

  if (serviceType.defaultPrice) {
    await prisma.processInstallment.create({
      data: { processId: process.id, position: 1, value: Number(serviceType.defaultPrice) },
    });
  }

  revalidatePath("/processos");
  revalidatePath("/portal");
  revalidatePath("/portal/processos");
  return { id: process.id };
}

export async function updateProcessStage(processId: string, toStageId: string) {
  const user = await requireStaff();
  const process = await loadProcessForWrite(processId, user);

  const stage = await prisma.kanbanStage.findFirst({
    where: { id: toStageId, tenantId: user.tenantId, workspaceId: process.workspaceId },
  });
  if (!stage) throw new Error("Etapa não encontrada nesta área de trabalho.");

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
    description: `Tarefa #${process.number} mudou de etapa.`,
    metadata: { fromStageId: process.stageId, toStageId },
  });

  revalidatePath("/processos");
  revalidatePath(`/processos/${processId}`);
}

export async function updateProcess(processId: string, input: ProcessInput) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);
  const data = processSchema.parse(input);

  await prisma.$transaction([
    prisma.process.update({
      where: { id: processId },
      data: {
        priority: data.priority,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        plannedStartAt: data.plannedStartAt ? new Date(data.plannedStartAt) : null,
        actualStartAt: data.actualStartAt ? new Date(data.actualStartAt) : null,
        actualCompletionAt: data.actualCompletionAt ? new Date(data.actualCompletionAt) : null,
        plannedDeliveryAt: data.plannedDeliveryAt ? new Date(data.plannedDeliveryAt) : null,
        actualDeliveryAt: data.actualDeliveryAt ? new Date(data.actualDeliveryAt) : null,
        visibleInPortal: data.visibleInPortal,
        notes: data.notes || null,
      },
    }),
    prisma.processAssignee.deleteMany({ where: { processId } }),
    prisma.processAssignee.createMany({
      data: data.assigneeIds.map((userId) => ({ processId, userId })),
    }),
  ]);

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
  revalidatePath("/financeiro");
  revalidatePath("/portal");
  revalidatePath("/portal/processos");
  revalidatePath(`/portal/processos/${processId}`);
}

/** Adiciona uma parcela de pagamento ao processo — posição sequencial
 * (Parcela 1, 2, 3...) na ordem de criação. */
export async function addInstallment(processId: string, value: string, paymentDueDate: string) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);

  const numericValue = Number(value);
  if (!value || Number.isNaN(numericValue) || numericValue <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }

  const last = await prisma.processInstallment.findFirst({
    where: { processId },
    orderBy: { position: "desc" },
  });

  await prisma.processInstallment.create({
    data: {
      processId,
      position: (last?.position ?? 0) + 1,
      value: numericValue,
      paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
    },
  });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
  revalidatePath("/financeiro");
  revalidatePath("/portal");
  revalidatePath("/portal/processos");
  revalidatePath(`/portal/processos/${processId}`);
}

const FINANCE_PATHS = (processId: string) => [
  `/processos/${processId}`,
  "/processos",
  "/financeiro",
  "/clientes",
  "/portal",
  "/portal/processos",
  `/portal/processos/${processId}`,
];

/** Valor da tarefa direto na tela de Detalhes (como no FreelaPRO): com zero ou uma parcela edita o
 * valor aqui; com várias parcelas o total depende de cada uma e é ajustado na aba Financeiro. */
export async function setProcessValue(processId: string, value: number) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);
  if (!Number.isFinite(value) || value < 0) throw new Error("Informe um valor válido.");
  const amount = Math.round(value * 100) / 100;

  const installments = await prisma.processInstallment.findMany({ where: { processId }, orderBy: { position: "asc" } });
  if (installments.length > 1) {
    throw new Error(`Esta tarefa tem ${installments.length} parcelas — altere os valores na aba Financeiro.`);
  }

  if (installments.length === 0) {
    if (amount === 0) return;
    await prisma.processInstallment.create({ data: { processId, position: 1, value: amount } });
  } else if (amount === 0) {
    if (installments[0].paidAt) throw new Error("A parcela já foi paga — estorne o pagamento na aba Financeiro antes de zerar o valor.");
    await prisma.processInstallment.delete({ where: { id: installments[0].id } });
  } else {
    await prisma.processInstallment.update({ where: { id: installments[0].id }, data: { value: amount } });
  }

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "process.value_changed",
    entityType: "process",
    entityId: processId,
    description: `Valor da tarefa alterado para R$ ${amount.toFixed(2)}.`,
  });
  FINANCE_PATHS(processId).forEach((p) => revalidatePath(p));
}

/** Pagamento da tarefa: Efetuado quita todas as parcelas; Pendente estorna todas. */
export async function setProcessPaymentStatus(processId: string, paid: boolean) {
  const user = await requireStaff();
  const process = await loadProcessForWrite(processId, user);

  const installments = await prisma.processInstallment.count({ where: { processId } });
  if (installments === 0) throw new Error("Informe o valor da tarefa antes de marcar o pagamento.");

  await prisma.processInstallment.updateMany({
    where: { processId, paidAt: paid ? null : { not: null } },
    data: { paidAt: paid ? new Date() : null },
  });
  await syncInvoicesAfterInstallmentChange({ tenantId: user.tenantId, processId, paid });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: paid ? "process.installment_paid" : "process.installment_unpaid",
    entityType: "process",
    entityId: processId,
    description: `Pagamento da tarefa #${process.number} marcado como ${paid ? "efetuado" : "pendente"}.`,
  });
  FINANCE_PATHS(processId).forEach((p) => revalidatePath(p));
}

/** Data do próximo pagamento: vale para a primeira parcela em aberto. */
export async function setNextPaymentDate(processId: string, date: string) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);

  const open = await prisma.processInstallment.findMany({ where: { processId, paidAt: null }, orderBy: { position: "asc" } });
  if (open.length === 0) throw new Error("Não há parcela em aberto para definir a data.");
  const target = [...open].sort((a, b) => {
    const ad = a.paymentDueDate?.getTime() ?? Infinity;
    const bd = b.paymentDueDate?.getTime() ?? Infinity;
    return ad - bd || a.position - b.position;
  })[0];

  await prisma.processInstallment.update({
    where: { id: target.id },
    data: { paymentDueDate: date ? new Date(date) : null },
  });
  FINANCE_PATHS(processId).forEach((p) => revalidatePath(p));
}

/** Edita valor, vencimento e (se já paga) a data do pagamento de uma parcela. */
export async function updateInstallment(
  processId: string,
  installmentId: string,
  input: { value: string; paymentDueDate: string; paidAt?: string }
) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);

  const numericValue = Number(String(input.value).replace(",", "."));
  if (!input.value || Number.isNaN(numericValue) || numericValue <= 0) {
    throw new Error("Informe um valor maior que zero.");
  }
  const installment = await prisma.processInstallment.findFirst({ where: { id: installmentId, processId } });
  if (!installment) throw new Error("Parcela não encontrada.");

  await prisma.processInstallment.update({
    where: { id: installmentId },
    data: {
      value: Math.round(numericValue * 100) / 100,
      paymentDueDate: input.paymentDueDate ? new Date(input.paymentDueDate) : null,
      ...(installment.paidAt && input.paidAt ? { paidAt: new Date(input.paidAt) } : {}),
    },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "process.installment_updated",
    entityType: "process",
    entityId: processId,
    description: `Parcela ${installment.position} alterada para R$ ${numericValue.toFixed(2)}.`,
  });
  FINANCE_PATHS(processId).forEach((p) => revalidatePath(p));
}

/** Marca/desmarca uma parcela como paga. */
/** Exclui a tarefa de vez (só administrador/gestor). Some o quadro, o financeiro e os relatórios dela —
 * para guardar o histórico use Arquivar. Arquivos enviados continuam nos documentos do cliente. Tarefa que
 * já está numa fatura não pode ser excluída. */
export async function deleteProcess(processId: string) {
  const user = await requireManageAccess();

  const process = await prisma.process.findFirst({
    where: { id: processId, tenantId: user.tenantId },
    select: { id: true, number: true, description: true, client: { select: { name: true } }, _count: { select: { invoiceItems: true } } },
  });
  if (!process) throw new Error("Tarefa não encontrada.");
  if (process._count.invoiceItems > 0) {
    throw new Error("Esta tarefa já está em uma fatura e não pode ser excluída. Use Arquivar para tirá-la do quadro.");
  }

  try {
  await prisma.$transaction([
    // arquivos e pedidos de documento ficam com o cliente, só perdem o vínculo com a tarefa
    prisma.document.updateMany({ where: { processId }, data: { processId: null } }),
    prisma.documentRequest.updateMany({ where: { processId }, data: { processId: null } }),
    prisma.licenseDocument.updateMany({ where: { autoTaskId: processId }, data: { autoTaskId: null } }),
    prisma.process.delete({ where: { id: processId } }),
  ]);
  } catch (err) {
    console.error("[excluir tarefa] falhou:", err);
    throw new Error("Não foi possível excluir: a tarefa tem vínculos que impedem a exclusão. Use Arquivar.");
  }

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "process.delete",
    entityType: "process",
    description: `Tarefa #${process.number} "${process.description}" (${process.client.name}) excluída.`,
  });

  FINANCE_PATHS(processId).forEach((p) => revalidatePath(p));
}

/** Arquiva/desarquiva a tarefa: sai do quadro e dos alertas, mas continua no
 * financeiro, nos relatórios do cliente e no histórico. */
export async function setProcessArchived(processId: string, archived: boolean) {
  const user = await requireStaff();
  const process = await loadProcessForWrite(processId, user);

  await prisma.process.update({
    where: { id: processId },
    data: { archivedAt: archived ? new Date() : null },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: archived ? "process.archive" : "process.unarchive",
    entityType: "process",
    entityId: processId,
    description: `Tarefa #${process.number} ${archived ? "arquivada" : "desarquivada"}.`,
  });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
  revalidatePath("/dashboard");
}

export async function markInstallmentPaid(processId: string, installmentId: string, paid: boolean) {
  const user = await requireStaff();
  const process = await loadProcessForWrite(processId, user);

  await prisma.processInstallment.update({
    where: { id: installmentId, processId },
    data: { paidAt: paid ? new Date() : null },
  });

  await syncInvoicesAfterInstallmentChange({ tenantId: user.tenantId, processId, paid });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: paid ? "process.installment_paid" : "process.installment_unpaid",
    entityType: "process",
    entityId: processId,
    description: `Parcela da tarefa #${process.number} marcada como ${paid ? "paga" : "pendente"}.`,
  });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
  revalidatePath("/financeiro");
  revalidatePath("/clientes");
  revalidatePath("/portal");
  revalidatePath("/portal/processos");
  revalidatePath(`/portal/processos/${processId}`);
}

export async function deleteInstallment(processId: string, installmentId: string) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);

  await prisma.processInstallment.delete({ where: { id: installmentId, processId } });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
  revalidatePath("/financeiro");
  revalidatePath("/portal");
  revalidatePath("/portal/processos");
  revalidatePath(`/portal/processos/${processId}`);
}

export async function addChecklistItem(processId: string, label: string, category?: string) {
  const user = await requireStaff();
  await loadProcessForWrite(processId, user);
  if (!label.trim()) throw new Error("Informe o item do checklist.");

  await prisma.processChecklistItem.create({
    data: { processId, label: label.trim(), category: category?.trim() || null },
  });
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

export async function createStage(workspaceId: string, label: string) {
  const user = await requireManageAccess();
  if (!label.trim()) throw new Error("Informe o nome da etapa.");

  const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId, tenantId: user.tenantId } });
  if (!workspace) throw new Error("Área de trabalho não encontrada.");

  const last = await prisma.kanbanStage.findFirst({
    where: { workspaceId },
    orderBy: { position: "desc" },
  });

  await prisma.kanbanStage.create({
    data: { tenantId: user.tenantId, workspaceId, label: label.trim(), position: (last?.position ?? 0) + 1 },
  });

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
}

export async function renameStage(stageId: string, label: string, color?: string) {
  const user = await requireManageAccess();
  if (!label.trim()) throw new Error("Informe o nome da etapa.");

  const result = await prisma.kanbanStage.updateMany({
    where: { id: stageId, tenantId: user.tenantId },
    data: { label: label.trim(), ...(color ? { color } : {}) },
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
  if (inUse > 0) throw new Error(`Existem ${inUse} tarefa(s) nesta etapa — mova-as antes de excluir.`);

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

  const current = await prisma.kanbanStage.findFirst({ where: { id: stageId, tenantId: user.tenantId } });
  if (!current) throw new Error("Etapa não encontrada.");

  const stages = await prisma.kanbanStage.findMany({
    where: { workspaceId: current.workspaceId },
    orderBy: { position: "asc" },
  });
  const index = stages.findIndex((s) => s.id === stageId);

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= stages.length) return;

  await swapStagePositions(stages[index].id, stages[targetIndex].id);

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
}

// --- Áreas de Trabalho (quadros Kanban independentes) ---

export async function createWorkspace(name: string) {
  const user = await requireManageAccess();
  if (!name.trim()) throw new Error("Informe o nome da área de trabalho.");

  const last = await prisma.workspace.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { position: "desc" },
  });

  const workspace = await prisma.workspace.create({
    data: { tenantId: user.tenantId, name: name.trim(), position: (last?.position ?? 0) + 1 },
  });

  await prisma.kanbanStage.create({
    data: { tenantId: user.tenantId, workspaceId: workspace.id, label: "Novo", position: 1 },
  });

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
  return { id: workspace.id };
}

export async function renameWorkspace(workspaceId: string, name: string) {
  const user = await requireManageAccess();
  if (!name.trim()) throw new Error("Informe o nome da área de trabalho.");

  const result = await prisma.workspace.updateMany({
    where: { id: workspaceId, tenantId: user.tenantId },
    data: { name: name.trim() },
  });
  if (result.count === 0) throw new Error("Área de trabalho não encontrada.");

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
}

export async function deleteWorkspace(workspaceId: string) {
  const user = await requireManageAccess();

  const workspace = await prisma.workspace.findFirst({ where: { id: workspaceId, tenantId: user.tenantId } });
  if (!workspace) throw new Error("Área de trabalho não encontrada.");

  const totalWorkspaces = await prisma.workspace.count({ where: { tenantId: user.tenantId } });
  if (totalWorkspaces <= 1) throw new Error("Precisa existir pelo menos uma área de trabalho.");

  const inUse = await prisma.process.count({ where: { workspaceId } });
  if (inUse > 0) throw new Error(`Existem ${inUse} tarefa(s) nesta área — mova-as antes de excluir.`);

  await prisma.$transaction([
    prisma.kanbanStage.deleteMany({ where: { workspaceId } }),
    prisma.workspace.delete({ where: { id: workspaceId } }),
  ]);

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
}

async function swapWorkspacePositions(workspaceAId: string, workspaceBId: string) {
  const [a, b] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceAId } }),
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceBId } }),
  ]);

  await prisma.$transaction([
    prisma.workspace.update({ where: { id: a.id }, data: { position: -1 } }),
    prisma.workspace.update({ where: { id: b.id }, data: { position: a.position } }),
    prisma.workspace.update({ where: { id: a.id }, data: { position: b.position } }),
  ]);
}

export async function moveWorkspace(workspaceId: string, direction: "up" | "down") {
  const user = await requireManageAccess();

  const workspaces = await prisma.workspace.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { position: "asc" },
  });
  const index = workspaces.findIndex((w) => w.id === workspaceId);
  if (index === -1) throw new Error("Área de trabalho não encontrada.");

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= workspaces.length) return;

  await swapWorkspacePositions(workspaces[index].id, workspaces[targetIndex].id);

  revalidatePath("/processos");
  revalidatePath("/processos/etapas");
}

// --- Comentários (equipe + cliente, integrado ao Portal) ---

/** Cria as menções de um comentário recém-criado — só membros da equipe do
 * mesmo tenant podem ser mencionados; o próprio autor nunca se auto-menciona. */
async function createCommentMentions(commentId: string, authorId: string, mentionedUserIds: string[], tenantId: string) {
  const candidateIds = Array.from(new Set(mentionedUserIds)).filter((id) => id !== authorId);
  if (candidateIds.length === 0) return;

  const staffInTenant = await prisma.user.findMany({
    where: { id: { in: candidateIds }, tenantId, role: { name: { in: ["ADMIN", "GESTOR", "OPERACIONAL"] } } },
    select: { id: true },
  });
  if (staffInTenant.length === 0) return;

  await prisma.processCommentMention.createMany({
    data: staffInTenant.map((u) => ({ commentId, mentionedUserId: u.id })),
  });
}

export async function addProcessComment(
  processId: string,
  body: string,
  mentionedUserIds: string[] = [],
  clientVisible = false
) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  if (!body.trim()) throw new Error("Escreva um comentário.");

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId } });
  if (!process) throw new Error("Tarefa não encontrada.");

  // Comentário da equipe nasce interno; só aparece no portal se marcado como visível ao cliente.
  const comment = await prisma.processComment.create({
    data: { processId, authorId: user.id, body: body.trim(), clientVisible },
  });
  await createCommentMentions(comment.id, user.id, mentionedUserIds, user.tenantId);

  revalidatePath(`/processos/${processId}`);
  revalidatePath(`/portal/processos/${processId}`);
}

/** Cliente comentando no próprio processo, pelo Portal — cliente não pode
 * mencionar ninguém (fora de escopo), mas o parâmetro existe pra manter a
 * mesma assinatura do componente compartilhado com o lado staff. */
export async function clientAddProcessComment(processId: string, body: string, _mentionedUserIds: string[] = []) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENTE" || !user.clientId) throw new Error("Acesso negado.");
  if (!body.trim()) throw new Error("Escreva um comentário.");

  const process = await prisma.process.findFirst({ where: { id: processId, clientId: user.clientId } });
  if (!process) throw new Error("Tarefa não encontrada.");

  await prisma.processComment.create({ data: { processId, authorId: user.id, body: body.trim(), clientVisible: true } });

  revalidatePath(`/portal/processos/${processId}`);
  revalidatePath(`/processos/${processId}`);
}

// --- Categorias (tipos de serviço): criadas na hora, sem módulo próprio ---

/** Cria a categoria (ou devolve a que já existe com o mesmo nome, sem diferenciar maiúsculas). */
export async function createCategory(name: string): Promise<{ id: string; name: string }> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  const clean = name.trim();
  if (clean.length < 2) throw new Error("Informe o nome da categoria.");

  const existing = await prisma.serviceType.findFirst({
    where: { tenantId: user.tenantId, name: { equals: clean, mode: "insensitive" } },
    select: { id: true, name: true },
  });
  if (existing) return existing;

  const created = await prisma.serviceType.create({
    data: { tenantId: user.tenantId, name: clean, active: true },
    select: { id: true, name: true },
  });
  revalidatePath("/processos");
  return created;
}

export async function setProcessCategory(processId: string, serviceTypeId: string) {
  const user = await requireInfoAccess(processId);
  const type = await prisma.serviceType.findFirst({ where: { id: serviceTypeId, tenantId: user.tenantId }, select: { id: true } });
  if (!type) throw new Error("Categoria não encontrada.");
  await prisma.process.update({ where: { id: processId }, data: { serviceTypeId } });
  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
}

// --- Aba "Informações": campos livres só da equipe ---

async function requireInfoAccess(processId: string) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  const process = await prisma.process.findFirst({
    where: { id: processId, tenantId: user.tenantId },
    select: { id: true, assignees: { select: { userId: true } } },
  });
  if (!process) throw new Error("Tarefa não encontrada.");
  if (user.role === "OPERACIONAL" && !process.assignees.some((a) => a.userId === user.id)) {
    throw new Error("Você não é responsável por esta tarefa.");
  }
  return user;
}

export async function addInfoField(processId: string, label: string, value: string) {
  const user = await requireInfoAccess(processId);
  if (!label.trim()) throw new Error("Informe o nome do campo.");
  const last = await prisma.processInfoField.aggregate({ where: { processId }, _max: { position: true } });
  await prisma.processInfoField.create({
    data: { processId, label: label.trim(), value: value.trim(), position: (last._max.position ?? 0) + 1, updatedById: user.id },
  });
  revalidatePath(`/processos/${processId}`);
}

export async function updateInfoField(fieldId: string, label: string, value: string) {
  const field = await prisma.processInfoField.findUnique({ where: { id: fieldId }, select: { processId: true } });
  if (!field) throw new Error("Campo não encontrado.");
  const user = await requireInfoAccess(field.processId);
  if (!label.trim()) throw new Error("Informe o nome do campo.");
  await prisma.processInfoField.update({
    where: { id: fieldId },
    data: { label: label.trim(), value: value.trim(), updatedById: user.id, updatedAt: new Date() },
  });
  revalidatePath(`/processos/${field.processId}`);
}

export async function deleteInfoField(fieldId: string) {
  const field = await prisma.processInfoField.findUnique({ where: { id: fieldId }, select: { processId: true } });
  if (!field) throw new Error("Campo não encontrado.");
  await requireInfoAccess(field.processId);
  await prisma.processInfoField.delete({ where: { id: fieldId } });
  revalidatePath(`/processos/${field.processId}`);
}

/** Equipe decide se um comentário aparece (ou não) para o cliente no portal. */
export async function setCommentClientVisible(commentId: string, visible: boolean) {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  const comment = await prisma.processComment.findFirst({
    where: { id: commentId, process: { tenantId: user.tenantId } },
    select: { id: true, processId: true, author: { select: { role: { select: { name: true } } } } },
  });
  if (!comment) throw new Error("Comentário não encontrado.");
  if (comment.author.role.name === "CLIENTE") throw new Error("Comentários do cliente são sempre visíveis a ele.");

  await prisma.processComment.update({ where: { id: commentId }, data: { clientVisible: visible } });
  revalidatePath(`/processos/${comment.processId}`);
  revalidatePath(`/portal/processos/${comment.processId}`);
}

/** Chamado ao abrir a tela do processo — marca os comentários e as menções
 * como vistos por esse membro da equipe, pra não continuar aparecendo como
 * "não lido". */
export async function markCommentsRead(processId: string) {
  const user = await getCurrentUser();
  if (!user || user.role === "CLIENTE") return;

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId } });
  if (!process) return;

  await prisma.$transaction([
    prisma.processCommentRead.upsert({
      where: { processId_userId: { processId, userId: user.id } },
      create: { processId, userId: user.id, lastReadAt: new Date() },
      update: { lastReadAt: new Date() },
    }),
    prisma.processCommentMention.updateMany({
      where: { mentionedUserId: user.id, readAt: null, comment: { processId } },
      data: { readAt: new Date() },
    }),
  ]);
}

// --- "Estou aqui" (presença manual, evita duplicar trabalho na equipe) ---

async function requirePresenceAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  return user;
}

/** Marca (ou renova) que o usuário está trabalhando neste processo agora —
 * chamado ao clicar "Estou aqui" e, enquanto ativo, a cada heartbeat. */
export async function markPresence(processId: string) {
  const user = await requirePresenceAccess();
  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId } });
  if (!process) throw new Error("Tarefa não encontrada.");

  await prisma.processPresence.upsert({
    where: { processId_userId: { processId, userId: user.id } },
    create: { processId, userId: user.id, lastSeenAt: new Date() },
    update: { lastSeenAt: new Date() },
  });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
}

/** Sai explicitamente ("Não estou mais aqui") — sem isso, a marca só some
 * sozinha depois de PRESENCE_EXPIRY_MINUTES sem heartbeat. */
export async function clearPresence(processId: string) {
  const user = await requirePresenceAccess();

  await prisma.processPresence.deleteMany({ where: { processId, userId: user.id } });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
}

// --- Impedimentos (bloqueio interno da equipe — não aparece no portal) ---

async function requireImpedimentAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  return user;
}

export async function addImpediment(processId: string, title: string) {
  const user = await requireImpedimentAccess();
  if (!title.trim()) throw new Error("Descreva o impedimento.");

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId } });
  if (!process) throw new Error("Tarefa não encontrada.");

  await prisma.processImpediment.create({ data: { processId, title: title.trim(), createdById: user.id } });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "process.impediment_add",
    entityType: "process",
    entityId: processId,
    description: `Impedimento registrado na tarefa #${process.number}: "${title.trim()}".`,
  });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
}

async function loadImpedimentForWrite(processId: string, impedimentId: string, tenantId: string) {
  const impediment = await prisma.processImpediment.findFirst({
    where: { id: impedimentId, processId, process: { tenantId } },
  });
  if (!impediment) throw new Error("Impedimento não encontrado.");
  return impediment;
}

export async function resolveImpediment(processId: string, impedimentId: string) {
  const user = await requireImpedimentAccess();
  await loadImpedimentForWrite(processId, impedimentId, user.tenantId);

  await prisma.processImpediment.update({
    where: { id: impedimentId },
    data: { resolvedAt: new Date(), resolvedById: user.id },
  });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
}

export async function reopenImpediment(processId: string, impedimentId: string) {
  const user = await requireImpedimentAccess();
  await loadImpedimentForWrite(processId, impedimentId, user.tenantId);

  await prisma.processImpediment.update({
    where: { id: impedimentId },
    data: { resolvedAt: null, resolvedById: null },
  });

  revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
}

// --- Entregáveis (texto, link ou arquivo já enviado) com aprovação do cliente ---

export type DeliverableInput = {
  type: "TEXTO" | "LINK" | "ARQUIVO";
  title: string;
  content?: string;
  url?: string;
  documentId?: string;
};

export async function addDeliverable(processId: string, input: DeliverableInput) {
  const user = await requireStaff();
  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId } });
  if (!process) throw new Error("Tarefa não encontrada.");

  if (!input.title.trim()) throw new Error("Informe um título para o entregável.");
  if (input.type === "LINK" && !input.url?.trim()) throw new Error("Informe o link do entregável.");
  if (input.type === "TEXTO" && !input.content?.trim()) throw new Error("Informe o conteúdo do entregável.");
  if (input.type === "ARQUIVO") {
    if (!input.documentId) throw new Error("Selecione um arquivo já enviado nesta tarefa.");
    const doc = await prisma.document.findFirst({ where: { id: input.documentId, processId } });
    if (!doc) throw new Error("Arquivo não encontrado nesta tarefa.");
  }

  await prisma.processDeliverable.create({
    data: {
      processId,
      type: input.type,
      title: input.title.trim(),
      content: input.content?.trim() || null,
      url: input.url?.trim() || null,
      documentId: input.documentId || null,
      createdById: user.id,
    },
  });

  revalidatePath(`/processos/${processId}`);
  revalidatePath(`/portal/processos/${processId}`);
}

export async function deleteDeliverable(processId: string, deliverableId: string) {
  const user = await requireStaff();
  const deliverable = await prisma.processDeliverable.findFirst({
    where: { id: deliverableId, processId, process: { tenantId: user.tenantId } },
  });
  if (!deliverable) throw new Error("Entregável não encontrado.");

  await prisma.processDeliverable.delete({ where: { id: deliverableId } });

  revalidatePath(`/processos/${processId}`);
  revalidatePath(`/portal/processos/${processId}`);
}

/** Cliente aprova/recusa um entregável pelo portal — só enquanto estiver pendente. */
export async function respondDeliverable(processId: string, deliverableId: string, approved: boolean, note: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENTE" || !user.clientId) throw new Error("Acesso negado.");

  const deliverable = await prisma.processDeliverable.findFirst({
    where: { id: deliverableId, processId, process: { clientId: user.clientId } },
    include: {
      process: {
        select: { number: true, assignees: { select: { user: { select: { email: true } } } } },
      },
    },
  });
  if (!deliverable) throw new Error("Entregável não encontrado.");
  if (deliverable.approvalStatus !== "PENDENTE") throw new Error("Este entregável já foi respondido.");

  await prisma.processDeliverable.update({
    where: { id: deliverableId },
    data: { approvalStatus: approved ? "APROVADO" : "RECUSADO", approvalNote: note.trim() || null },
  });

  revalidatePath(`/portal/processos/${processId}`);
  revalidatePath(`/processos/${processId}`);

  const { subject, html } = deliverableRespondedEmail({
    processId,
    processNumber: deliverable.process.number,
    deliverableTitle: deliverable.title,
    approved,
    note: note.trim() || null,
  });
  for (const assignee of deliverable.process.assignees) {
    await sendEmail({ to: assignee.user.email, subject, html });
  }
}
