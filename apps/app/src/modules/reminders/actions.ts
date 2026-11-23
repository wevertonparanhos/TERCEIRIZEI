"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { brtDay, isSnoozeOption, snoozeTo } from "@/modules/reminders/logic";

// Em produção o Next esconde a mensagem de erros lançados por Server Actions: os avisos esperados voltam como resultado.
export type ReminderResult = { ok: true } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

// A conexão do Prisma bypassa RLS — tenant_id explícito em todo where é a fronteira real.
async function requireStaff(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && ["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role) ? user : null;
}

/** Administrador e gestor mexem em qualquer tarefa; o operacional só nas em que é responsável. */
async function canTouchProcess(user: CurrentUser, processId: string): Promise<{ number: number } | null> {
  const process = await prisma.process.findFirst({
    where: { id: processId, tenantId: user.tenantId },
    select: { number: true, assignees: { select: { userId: true } } },
  });
  if (!process) return null;
  if (user.role === "OPERACIONAL" && !process.assignees.some((a) => a.userId === user.id)) return null;
  return { number: process.number };
}

function refresh(processId?: string) {
  if (processId) revalidatePath(`/processos/${processId}`);
  revalidatePath("/processos");
  revalidatePath("/lembretes");
  revalidatePath("/calendario");
}

export async function createReminder(processId: string, date: string, note: string): Promise<ReminderResult> {
  const user = await requireStaff();
  if (!user) return fail("Você não tem acesso a este módulo.");
  const process = await canTouchProcess(user, processId);
  if (!process) return fail("Tarefa não encontrada ou você não é responsável por ela.");

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  if (!m) return fail("Escolha a data do lembrete.");
  const remindOn = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (remindOn.getUTCMonth() !== Number(m[2]) - 1) return fail("Data inválida.");
  if (remindOn.getTime() < brtDay(new Date()).getTime() - 24 * 60 * 60 * 1000) return fail("Escolha uma data de hoje em diante.");
  const cleanNote = (note ?? "").trim().slice(0, 300);

  await prisma.taskReminder.create({
    data: { tenantId: user.tenantId, processId, remindOn, note: cleanNote, createdById: user.id },
  });
  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "reminder.create",
    entityType: "process",
    entityId: processId,
    description: `Lembrete criado na tarefa #${process.number} para ${remindOn.toLocaleDateString("pt-BR", { timeZone: "UTC" })}${cleanNote ? `: "${cleanNote}"` : ""}.`,
  });
  refresh(processId);
  return { ok: true };
}

/** Carrega o lembrete só se a pessoa pode mexer nele (quem criou, ou quem pode mexer na tarefa). */
async function loadReminder(user: CurrentUser, reminderId: string) {
  const reminder = await prisma.taskReminder.findFirst({
    where: { id: reminderId, tenantId: user.tenantId },
    select: { id: true, processId: true, createdById: true, remindOn: true, process: { select: { number: true } } },
  });
  if (!reminder) return null;
  if (reminder.createdById !== user.id && !(await canTouchProcess(user, reminder.processId))) return null;
  return reminder;
}

/** "Feito": a tarefa foi verificada e o lembrete sai da lista. */
export async function completeReminder(reminderId: string): Promise<ReminderResult> {
  const user = await requireStaff();
  if (!user) return fail("Você não tem acesso a este módulo.");
  const reminder = await loadReminder(user, reminderId);
  if (!reminder) return fail("Lembrete não encontrado. Atualize a página.");

  await prisma.taskReminder.update({ where: { id: reminderId }, data: { doneAt: new Date(), doneById: user.id } });
  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "reminder.done",
    entityType: "process",
    entityId: reminder.processId,
    description: `Lembrete da tarefa #${reminder.process.number} marcado como feito.`,
  });
  refresh(reminder.processId);
  return { ok: true };
}

/** "Adiar": o lembrete volta amanhã, em 3 dias ou em 1 semana (contados a partir de hoje). */
export async function snoozeReminder(reminderId: string, option: string): Promise<ReminderResult> {
  const user = await requireStaff();
  if (!user) return fail("Você não tem acesso a este módulo.");
  if (!isSnoozeOption(option)) return fail("Escolha uma opção de adiamento válida.");
  const reminder = await loadReminder(user, reminderId);
  if (!reminder) return fail("Lembrete não encontrado. Atualize a página.");

  await prisma.taskReminder.update({ where: { id: reminderId }, data: { remindOn: snoozeTo(brtDay(new Date()), option) } });
  refresh(reminder.processId);
  return { ok: true };
}

export async function deleteReminder(reminderId: string): Promise<ReminderResult> {
  const user = await requireStaff();
  if (!user) return fail("Você não tem acesso a este módulo.");
  const reminder = await loadReminder(user, reminderId);
  if (!reminder) return fail("Lembrete não encontrado. Atualize a página.");

  await prisma.taskReminder.delete({ where: { id: reminderId } });
  refresh(reminder.processId);
  return { ok: true };
}

/** Adia o alerta de "tarefa parada na etapa" de uma tarefa (1 dia, 3 dias ou 1 semana). */
export async function snoozeStageAlert(processId: string, option: string): Promise<ReminderResult> {
  const user = await requireStaff();
  if (!user) return fail("Você não tem acesso a este módulo.");
  if (!isSnoozeOption(option)) return fail("Escolha uma opção de adiamento válida.");
  const process = await canTouchProcess(user, processId);
  if (!process) return fail("Tarefa não encontrada ou você não é responsável por ela.");

  await prisma.process.update({ where: { id: processId }, data: { stageAlertSnoozedUntil: snoozeTo(brtDay(new Date()), option) } });
  refresh(processId);
  return { ok: true };
}
