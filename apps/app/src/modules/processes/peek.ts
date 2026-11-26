"use server";

import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { brtDay, reminderTiming, type ReminderTiming } from "@/modules/reminders/logic";
import { getProcessPaymentSummary, isPresenceActive, PRIORITY_LABELS, serviceTypeLabel } from "@/modules/processes/labels";

export type TaskPeek = {
  id: string;
  number: number;
  title: string;
  workspaceName: string;
  stageId: string;
  stages: { id: string; label: string; color: string }[];
  clientId: string;
  clientName: string;
  companyName: string | null;
  tags: string;
  priority: string;
  assigneeNames: string[];
  presenceNames: string[];
  /** AAAA-MM-DD */
  startedOn: string | null;
  dueOn: string | null;
  isOverdue: boolean;
  notes: string;
  checklist: { id: string; label: string; done: boolean }[];
  reminders: { id: string; remindOn: string; note: string; timing: ReminderTiming; createdByName: string }[];
  payments: { id: string; label: string; value: number; dueOn: string | null; paid: boolean }[];
  paymentTotal: number;
  paidTotal: number;
  comments: { id: string; authorName: string; body: string; createdAt: string; fromClient: boolean }[];
  commentCount: number;
  openImpediments: string[];
  /** pode mexer na tarefa (etapa, checklist, pagamentos, lembretes) */
  canWrite: boolean;
  /** pode comentar */
  canComment: boolean;
};

export type TaskPeekResult = { ok: true; task: TaskPeek } | { ok: false; error: string };

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Resumo da tarefa para o painel que abre ao lado do quadro. Mesmas regras de acesso da página da tarefa. */
export async function loadTaskPeek(processId: string): Promise<TaskPeekResult> {
  try {
    const user = await getCurrentUser();
    if (!user || !["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"].includes(user.role)) return { ok: false, error: "Sessão expirada. Entre de novo." };

    // Tudo em paralelo (uma ida ao banco em vez de uma por parte da tarefa). Cada consulta das listas
    // também exige que a tarefa seja desta empresa, então nada vaza mesmo antes de conferir a principal.
    const ofThisTask = { processId, process: { tenantId: user.tenantId } };
    const [main, serviceTypeTags, assignees, presence, checklist, reminders, installments, comments, commentCount, impediments] = await Promise.all([
      prisma.process.findFirst({
        where: { id: processId, tenantId: user.tenantId },
        select: {
          id: true,
          number: true,
          description: true,
          notes: true,
          priority: true,
          stageId: true,
          createdAt: true,
          dueAt: true,
          clientId: true,
          workspace: { select: { name: true, stages: { orderBy: { position: "asc" }, select: { id: true, label: true, color: true } } } },
          stage: { select: { label: true } },
          client: { select: { name: true } },
          company: { select: { razaoSocial: true, nomeFantasia: true } },
          serviceType: { select: { name: true } },
        },
      }),
      prisma.processServiceType.findMany({ where: ofThisTask, select: { serviceType: { select: { name: true } } } }),
      prisma.processAssignee.findMany({ where: ofThisTask, select: { userId: true, user: { select: { name: true } } } }),
      prisma.processPresence.findMany({ where: ofThisTask, select: { lastSeenAt: true, user: { select: { name: true } } } }),
      prisma.processChecklistItem.findMany({ where: ofThisTask, orderBy: { createdAt: "asc" }, select: { id: true, label: true, done: true } }),
      prisma.taskReminder.findMany({
        where: { ...ofThisTask, doneAt: null },
        orderBy: [{ remindOn: "asc" }, { createdAt: "asc" }],
        select: { id: true, remindOn: true, note: true, createdBy: { select: { name: true } } },
      }),
      prisma.processInstallment.findMany({
        where: ofThisTask,
        orderBy: { position: "asc" },
        select: { id: true, position: true, title: true, value: true, paymentDueDate: true, paidAt: true },
      }),
      prisma.processComment.findMany({
        where: ofThisTask,
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { id: true, body: true, createdAt: true, author: { select: { name: true, role: { select: { name: true } } } } },
      }),
      prisma.processComment.count({ where: ofThisTask }),
      prisma.processImpediment.findMany({ where: { ...ofThisTask, resolvedAt: null }, select: { title: true } }),
    ]);
    if (!main) return { ok: false, error: "Tarefa não encontrada." };
    const p = {
      ...main,
      serviceTypeTags,
      assignees,
      presence,
      checklist,
      reminders,
      installments,
      comments,
      _count: { comments: commentCount },
      impediments,
    };

    const isAssigned = p.assignees.some((a) => a.userId === user.id);
    if (user.role === "OPERACIONAL" && !isAssigned) {
      const mentioned = await prisma.processCommentMention.count({ where: { mentionedUserId: user.id, comment: { processId: p.id } } });
      if (mentioned === 0) return { ok: false, error: "Você só vê as tarefas em que é responsável." };
    }

    const today = brtDay(new Date());
    const summary = getProcessPaymentSummary(p.installments.map((i) => ({ value: Number(i.value), paidAt: i.paidAt, paymentDueDate: i.paymentDueDate })));
    const tags = serviceTypeLabel(p.serviceType.name, p.serviceTypeTags.map((t) => t.serviceType.name));
    const terminal = ["Concluído", "Cancelado"].includes(p.stage.label);

    return {
      ok: true,
      task: {
        id: p.id,
        number: p.number,
        title: p.description,
        workspaceName: p.workspace.name,
        stageId: p.stageId,
        stages: p.workspace.stages.map((s) => ({ id: s.id, label: s.label, color: s.color })),
        clientId: p.clientId,
        clientName: p.client.name,
        companyName: p.company ? p.company.nomeFantasia || p.company.razaoSocial : null,
        tags,
        priority: PRIORITY_LABELS[p.priority] ?? String(p.priority),
        assigneeNames: p.assignees.map((a) => a.user.name),
        presenceNames: p.presence.filter((x) => isPresenceActive(x.lastSeenAt)).map((x) => x.user.name),
        startedOn: iso(p.createdAt),
        dueOn: iso(p.dueAt),
        isOverdue: !!p.dueAt && !terminal && p.dueAt.getTime() < Date.now(),
        notes: p.notes ?? "",
        checklist: p.checklist,
        reminders: p.reminders.map((r) => ({
          id: r.id,
          remindOn: iso(r.remindOn) as string,
          note: r.note,
          timing: reminderTiming(r.remindOn, today),
          createdByName: r.createdBy.name,
        })),
        payments: p.installments.map((i) => ({
          id: i.id,
          label: i.title?.trim() || `Parcela ${i.position}`,
          value: Number(i.value),
          dueOn: iso(i.paymentDueDate),
          paid: i.paidAt !== null,
        })),
        paymentTotal: summary.totalValue,
        paidTotal: p.installments.filter((i) => i.paidAt).reduce((s, i) => s + Number(i.value), 0),
        comments: p.comments
          .map((c) => ({
            id: c.id,
            authorName: c.author.name,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            fromClient: c.author.role.name === "CLIENTE",
          }))
          .reverse(),
        commentCount: p._count.comments,
        openImpediments: p.impediments.map((i) => i.title),
        canWrite: user.role === "ADMIN" || user.role === "GESTOR" || (user.role === "OPERACIONAL" && isAssigned),
        canComment: ["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role),
      },
    };
  } catch (err) {
    console.error("[painel da tarefa] falhou:", err);
    return { ok: false, error: "Não foi possível carregar a tarefa. Tente de novo." };
  }
}
