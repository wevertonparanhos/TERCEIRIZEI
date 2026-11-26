import { prisma } from "@terceirizei/db";
import type { CurrentUser } from "@/lib/rbac";
import { brtDay } from "@/modules/reminders/logic";
import { addDays } from "@/modules/today/logic";

const ACTIVE_STAGE_FILTER = { notIn: ["Concluído", "Cancelado"] };

export type TodayDelivery = { id: string; number: number; title: string; clientName: string; dueAt: Date; stageLabel: string; assigneeNames: string[] };
export type TodayReceivable = { id: string; processId: string; processNumber: number; processTitle: string; clientName: string; label: string; value: number; dueDate: Date };
export type TodayPortalRequest = { id: string; clientName: string; serviceName: string; createdAt: Date };
export type TodayMention = { id: string; processId: string; processNumber: number; processTitle: string; authorName: string; createdAt: Date };

export type TodayData = {
  today: Date;
  overdueCount: number;
  activeCount: number;
  deliveries: TodayDelivery[];
  /** null quando a pessoa não vê o financeiro */
  receivables: { total: number; count: number; items: TodayReceivable[] } | null;
  /** null quando a pessoa não revisa pedidos do portal */
  portal: { count: number; items: TodayPortalRequest[] } | null;
  mentions: { count: number; items: TodayMention[] };
};

/** Tudo que a tela Hoje mostra além dos lembretes, numa ida ao banco em paralelo. O operacional vê só as tarefas em que é responsável. */
export async function loadToday(user: CurrentUser, now: Date = new Date()): Promise<TodayData> {
  const today = brtDay(now);
  const scope = user.role === "OPERACIONAL" ? { assignees: { some: { userId: user.id } } } : {};
  const canSeeFinance = ["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role);
  const canReviewPortal = ["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role);
  const activeWhere = { tenantId: user.tenantId, archivedAt: null, stage: { label: ACTIVE_STAGE_FILTER }, ...scope };
  const weekEnd = addDays(today, 7);

  const [overdueCount, activeCount, deliveryRows, receivableRows, portalCount, portalRows, mentionCount, mentionRows] = await Promise.all([
    prisma.process.count({ where: { ...activeWhere, dueAt: { lt: now } } }),
    prisma.process.count({ where: activeWhere }),
    prisma.process.findMany({
      where: { ...activeWhere, dueAt: { gte: today, lt: addDays(today, 3) } },
      orderBy: { dueAt: "asc" },
      take: 8,
      select: {
        id: true,
        number: true,
        description: true,
        dueAt: true,
        client: { select: { name: true } },
        stage: { select: { label: true } },
        assignees: { select: { user: { select: { name: true } } } },
      },
    }),
    canSeeFinance
      ? prisma.processInstallment.findMany({
          where: { paidAt: null, paymentDueDate: { gte: today, lt: weekEnd }, process: { tenantId: user.tenantId } },
          orderBy: { paymentDueDate: "asc" },
          select: {
            id: true,
            position: true,
            title: true,
            value: true,
            paymentDueDate: true,
            process: { select: { id: true, number: true, description: true, client: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    canReviewPortal ? prisma.portalRequest.count({ where: { tenantId: user.tenantId, status: "PENDENTE" } }) : Promise.resolve(0),
    canReviewPortal
      ? prisma.portalRequest.findMany({
          where: { tenantId: user.tenantId, status: "PENDENTE" },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: { id: true, createdAt: true, client: { select: { name: true } }, serviceType: { select: { name: true } } },
        })
      : Promise.resolve([]),
    prisma.processCommentMention.count({
      where: { mentionedUserId: user.id, readAt: null, comment: { process: { tenantId: user.tenantId } } },
    }),
    prisma.processCommentMention.findMany({
      where: { mentionedUserId: user.id, readAt: null, comment: { process: { tenantId: user.tenantId } } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        createdAt: true,
        comment: { select: { author: { select: { name: true } }, process: { select: { id: true, number: true, description: true } } } },
      },
    }),
  ]);

  const receivableItems: TodayReceivable[] = receivableRows.map((r) => ({
    id: r.id,
    processId: r.process.id,
    processNumber: r.process.number,
    processTitle: r.process.description,
    clientName: r.process.client.name,
    label: r.title?.trim() || `Parcela ${r.position}`,
    value: Number(r.value),
    dueDate: r.paymentDueDate as Date,
  }));

  return {
    today,
    overdueCount,
    activeCount,
    deliveries: deliveryRows.map((p) => ({
      id: p.id,
      number: p.number,
      title: p.description,
      clientName: p.client.name,
      dueAt: p.dueAt as Date,
      stageLabel: p.stage.label,
      assigneeNames: p.assignees.map((a) => a.user.name),
    })),
    receivables: canSeeFinance
      ? { total: receivableItems.reduce((sum, r) => sum + r.value, 0), count: receivableItems.length, items: receivableItems.slice(0, 6) }
      : null,
    portal: canReviewPortal
      ? {
          count: portalCount,
          items: portalRows.map((r) => ({ id: r.id, clientName: r.client.name, serviceName: r.serviceType.name, createdAt: r.createdAt })),
        }
      : null,
    mentions: {
      count: mentionCount,
      items: mentionRows.map((m) => ({
        id: m.id,
        processId: m.comment.process.id,
        processNumber: m.comment.process.number,
        processTitle: m.comment.process.description,
        authorName: m.comment.author.name,
        createdAt: m.createdAt,
      })),
    },
  };
}
