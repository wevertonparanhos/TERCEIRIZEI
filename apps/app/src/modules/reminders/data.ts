import { cache } from "react";
import { prisma } from "@terceirizei/db";
import type { CurrentUser } from "@/lib/rbac";
import { brtDay, reminderTiming, stageAlert, type ReminderTiming } from "@/modules/reminders/logic";

const TERMINAL_STAGES = ["Concluído", "Cancelado"];

export type ReminderItem = {
  id: string;
  processId: string;
  processNumber: number;
  processTitle: string;
  clientName: string;
  remindOn: Date;
  note: string;
  createdByName: string;
  assigneeNames: string[];
  timing: ReminderTiming;
};

export type StageAlertItem = {
  processId: string;
  processNumber: number;
  processTitle: string;
  clientName: string;
  stageLabel: string;
  alertAfterDays: number;
  daysInStage: number;
  overdueBy: number;
  assigneeNames: string[];
};

export type ReminderOverview = {
  reminders: ReminderItem[];
  stageAlerts: StageAlertItem[];
  /** o que pede atenção agora: lembretes atrasados ou de hoje + tarefas paradas */
  attentionCount: number;
};

/** Quem enxerga o quê: administrador e gestor veem tudo; o operacional, as tarefas em que é responsável e os lembretes que criou. */
function scopeFor(user: CurrentUser) {
  return user.role === "OPERACIONAL" ? { assignees: { some: { userId: user.id } } } : {};
}

/** Lembretes em aberto e tarefas paradas (alerta de etapa) que a pessoa pode ver. Financeiro não usa lembretes.
 * Em cache por requisição: o menu (selo) e a página (Hoje, Lembretes) usam o mesmo resultado. */
export const loadReminderOverview = cache(async (user: CurrentUser): Promise<ReminderOverview> => {
  if (!["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) return { reminders: [], stageAlerts: [], attentionCount: 0 };
  const today = brtDay(new Date());

  const [reminderRows, stageRows] = await Promise.all([
    prisma.taskReminder.findMany({
      where: {
        tenantId: user.tenantId,
        doneAt: null,
        process: { archivedAt: null },
        ...(user.role === "OPERACIONAL" ? { OR: [{ createdById: user.id }, { process: scopeFor(user) }] } : {}),
      },
      orderBy: [{ remindOn: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        remindOn: true,
        note: true,
        createdBy: { select: { name: true } },
        process: {
          select: { id: true, number: true, description: true, client: { select: { name: true } }, assignees: { select: { user: { select: { name: true } } } } },
        },
      },
    }),
    prisma.process.findMany({
      where: {
        tenantId: user.tenantId,
        archivedAt: null,
        stage: { alertAfterDays: { not: null }, label: { notIn: TERMINAL_STAGES } },
        ...scopeFor(user),
      },
      select: {
        id: true,
        number: true,
        description: true,
        createdAt: true,
        stageAlertSnoozedUntil: true,
        client: { select: { name: true } },
        stage: { select: { label: true, alertAfterDays: true } },
        stageHistory: { orderBy: { changedAt: "desc" }, take: 1, select: { changedAt: true } },
        assignees: { select: { user: { select: { name: true } } } },
      },
    }),
  ]);

  const reminders: ReminderItem[] = reminderRows.map((r) => ({
    id: r.id,
    processId: r.process.id,
    processNumber: r.process.number,
    processTitle: r.process.description,
    clientName: r.process.client.name,
    remindOn: r.remindOn,
    note: r.note,
    createdByName: r.createdBy.name,
    assigneeNames: r.process.assignees.map((a) => a.user.name),
    timing: reminderTiming(r.remindOn, today),
  }));

  const stageAlerts: StageAlertItem[] = [];
  for (const p of stageRows) {
    const alert = stageAlert({
      alertAfterDays: p.stage.alertAfterDays,
      enteredAt: p.stageHistory[0]?.changedAt ?? p.createdAt,
      today,
      snoozedUntil: p.stageAlertSnoozedUntil,
    });
    if (!alert || !p.stage.alertAfterDays) continue;
    stageAlerts.push({
      processId: p.id,
      processNumber: p.number,
      processTitle: p.description,
      clientName: p.client.name,
      stageLabel: p.stage.label,
      alertAfterDays: p.stage.alertAfterDays,
      daysInStage: alert.daysInStage,
      overdueBy: alert.overdueBy,
      assigneeNames: p.assignees.map((a) => a.user.name),
    });
  }
  stageAlerts.sort((a, b) => b.overdueBy - a.overdueBy);

  const attentionCount = reminders.filter((r) => r.timing !== "futuro").length + stageAlerts.length;
  return { reminders, stageAlerts, attentionCount };
});
