"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { MAX_QUESTIONS, portalSettingsSchema, questionSchema, type PortalSettingsInput, type QuestionInput } from "@/modules/portal/settings";

// A conexão do Prisma bypassa RLS — tenant_id explícito em todo where/data é a fronteira real.
async function requireManageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR"].includes(user.role)) throw new Error("Você não tem permissão para configurar o portal.");
  return user;
}

async function assertClient(clientId: string, tenantId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } });
  if (!client) throw new Error("Cliente não encontrado.");
}

/** Mensagem de boas-vindas, cor de destaque e se o cliente pode abrir demandas pelo portal. */
export async function savePortalSettings(clientId: string, input: PortalSettingsInput) {
  const user = await requireManageAccess();
  const data = portalSettingsSchema.parse(input);
  await assertClient(clientId, user.tenantId);

  const values = {
    welcomeMessage: data.welcomeMessage || null,
    accentColor: data.accentColor,
    allowRequests: data.allowRequests,
    reviewRequests: data.reviewRequests,
    allowApprovals: data.allowApprovals,
  };
  await prisma.clientPortalSettings.upsert({
    where: { clientId },
    create: { clientId, tenantId: user.tenantId, ...values },
    update: values,
  });

  revalidatePath(`/clientes/${clientId}/portal`);
  revalidatePath("/portal");
}

/** Mostra ou oculta UMA tarefa no portal do cliente. */
export async function setProcessPortalVisibility(clientId: string, processId: string, visible: boolean) {
  const user = await requireManageAccess();
  const result = await prisma.process.updateMany({
    where: { id: processId, clientId, tenantId: user.tenantId },
    data: { visibleInPortal: visible },
  });
  if (result.count === 0) throw new Error("Tarefa não encontrada.");
  revalidatePath(`/clientes/${clientId}/portal`);
  revalidatePath("/portal");
}

/** Mostra ou oculta TODAS as tarefas do cliente no portal de uma vez. */
export async function setAllPortalVisibility(clientId: string, visible: boolean) {
  const user = await requireManageAccess();
  await assertClient(clientId, user.tenantId);
  await prisma.process.updateMany({ where: { clientId, tenantId: user.tenantId }, data: { visibleInPortal: visible } });
  revalidatePath(`/clientes/${clientId}/portal`);
  revalidatePath("/portal");
}

// ---------- Perguntas do pedido ----------

/** Pergunta extra no formulário de pedido deste cliente. */
export async function addPortalQuestion(clientId: string, input: QuestionInput) {
  const user = await requireManageAccess();
  const data = questionSchema.parse(input);
  await assertClient(clientId, user.tenantId);
  const existing = await prisma.clientPortalQuestion.count({ where: { clientId, tenantId: user.tenantId } });
  if (existing >= MAX_QUESTIONS) throw new Error(`Cada cliente pode ter até ${MAX_QUESTIONS} perguntas.`);
  await prisma.clientPortalQuestion.create({ data: { tenantId: user.tenantId, clientId, label: data.label, kind: data.kind, required: data.required, position: existing } });
  revalidatePath(`/clientes/${clientId}/portal`);
}

export async function updatePortalQuestion(clientId: string, questionId: string, input: QuestionInput) {
  const user = await requireManageAccess();
  const data = questionSchema.parse(input);
  const result = await prisma.clientPortalQuestion.updateMany({
    where: { id: questionId, clientId, tenantId: user.tenantId },
    data: { label: data.label, kind: data.kind, required: data.required },
  });
  if (result.count === 0) throw new Error("Pergunta não encontrada.");
  revalidatePath(`/clientes/${clientId}/portal`);
}

export async function deletePortalQuestion(clientId: string, questionId: string) {
  const user = await requireManageAccess();
  await prisma.clientPortalQuestion.deleteMany({ where: { id: questionId, clientId, tenantId: user.tenantId } });
  // reordena as restantes sem buracos
  const rest = await prisma.clientPortalQuestion.findMany({ where: { clientId, tenantId: user.tenantId }, orderBy: { position: "asc" }, select: { id: true } });
  await prisma.$transaction(rest.map((q, i) => prisma.clientPortalQuestion.update({ where: { id: q.id }, data: { position: i } })));
  revalidatePath(`/clientes/${clientId}/portal`);
}

export async function movePortalQuestion(clientId: string, questionId: string, direction: "up" | "down") {
  const user = await requireManageAccess();
  const list = await prisma.clientPortalQuestion.findMany({ where: { clientId, tenantId: user.tenantId }, orderBy: { position: "asc" }, select: { id: true } });
  const index = list.findIndex((q) => q.id === questionId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  await prisma.$transaction(list.map((q, i) => prisma.clientPortalQuestion.update({ where: { id: q.id }, data: { position: i } })));
  revalidatePath(`/clientes/${clientId}/portal`);
}

/** Copia as perguntas de outro cliente para este (sem repetir as que já existem). */
export async function copyPortalQuestions(clientId: string, fromClientId: string) {
  const user = await requireManageAccess();
  await assertClient(clientId, user.tenantId);
  await assertClient(fromClientId, user.tenantId);
  const [source, current] = await Promise.all([
    prisma.clientPortalQuestion.findMany({ where: { clientId: fromClientId, tenantId: user.tenantId }, orderBy: { position: "asc" } }),
    prisma.clientPortalQuestion.findMany({ where: { clientId, tenantId: user.tenantId }, select: { label: true } }),
  ]);
  const have = new Set(current.map((q) => q.label.trim().toLowerCase()));
  const toAdd = source.filter((q) => !have.has(q.label.trim().toLowerCase())).slice(0, Math.max(0, MAX_QUESTIONS - current.length));
  if (toAdd.length === 0) return { added: 0 };
  await prisma.clientPortalQuestion.createMany({
    data: toAdd.map((q, i) => ({ tenantId: user.tenantId, clientId, label: q.label, kind: q.kind, required: q.required, position: current.length + i })),
  });
  revalidatePath(`/clientes/${clientId}/portal`);
  return { added: toAdd.length };
}
