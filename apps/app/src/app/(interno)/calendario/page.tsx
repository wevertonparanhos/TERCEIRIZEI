import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { CalendarNav } from "@/modules/calendar/calendar-nav";
import { CalendarGrid } from "@/modules/calendar/calendar-grid";
import { resolveMonthKey, getMonthGridRange } from "@/modules/calendar/month";
import { buildCalendarEvents, groupEventsByDay, EVENT_TYPE_LABELS, EVENT_TYPE_DOT, EVENT_TYPES } from "@/modules/calendar/events";

export default async function CalendarioPage({ searchParams }: { searchParams: { mes?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"].includes(user.role)) redirect("/dashboard");

  const monthKey = resolveMonthKey(searchParams.mes);
  const { start, end } = getMonthGridRange(monthKey);

  const isOperacional = user.role === "OPERACIONAL";
  const isFinanceiro = user.role === "FINANCEIRO";

  const [recurringTasks, processDeadlines, tasks, payments, documentRequests] = await Promise.all([
    isFinanceiro
      ? Promise.resolve([])
      : prisma.recurringTask.findMany({
          where: {
            tenantId: user.tenantId,
            active: true,
            nextDueAt: { gte: start, lte: end },
            ...(isOperacional ? { assigneeId: user.id } : {}),
          },
          include: { client: { select: { name: true } } },
        }),
    isFinanceiro
      ? Promise.resolve([])
      : prisma.process.findMany({
          where: {
            tenantId: user.tenantId,
            requestedDeadline: { gte: start, lte: end },
            ...(isOperacional ? { assignedUserId: user.id } : {}),
          },
          include: { client: { select: { name: true } } },
        }),
    isFinanceiro
      ? Promise.resolve([])
      : prisma.task.findMany({
          where: {
            status: { not: "CONCLUIDA" },
            dueAt: { gte: start, lte: end },
            process: { tenantId: user.tenantId },
            ...(isOperacional ? { assigneeId: user.id } : {}),
          },
          include: { process: { select: { number: true, client: { select: { name: true } } } } },
        }),
    isOperacional
      ? Promise.resolve([])
      : prisma.process.findMany({
          where: {
            tenantId: user.tenantId,
            value: { not: null },
            paidAt: null,
            paymentDueDate: { gte: start, lte: end },
          },
          include: { client: { select: { name: true } } },
        }),
    isFinanceiro
      ? Promise.resolve([])
      : prisma.documentRequest.findMany({
          where: {
            tenantId: user.tenantId,
            status: "PENDENTE",
            deadline: { gte: start, lte: end },
          },
          include: { client: { select: { name: true } } },
        }),
  ]);

  const events = buildCalendarEvents({
    recurringTasks: recurringTasks.map((t) => ({ id: t.id, title: t.title, nextDueAt: t.nextDueAt, clientName: t.client.name })),
    processDeadlines: processDeadlines.map((p) => ({
      id: p.id,
      number: p.number,
      description: p.description,
      requestedDeadline: p.requestedDeadline!,
      clientName: p.client.name,
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueAt: t.dueAt!,
      processId: t.processId,
      processNumber: t.process.number,
      clientName: t.process.client.name,
    })),
    payments: payments.map((p) => ({
      id: p.id,
      number: p.number,
      description: p.description,
      paymentDueDate: p.paymentDueDate!,
      clientName: p.client.name,
    })),
    documentRequests: documentRequests.map((d) => ({
      id: d.id,
      label: d.label,
      deadline: d.deadline!,
      clientName: d.client.name,
      processId: d.processId,
    })),
  });

  const eventsByDay = Object.fromEntries(groupEventsByDay(events));

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Calendário</h1>
          <p className="text-sm text-muted">
            Tarefas recorrentes, prazos de processos, pagamentos e documentos pendentes em um só lugar.
          </p>
        </div>
        <CalendarNav monthKey={monthKey} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {EVENT_TYPES.map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${EVENT_TYPE_DOT[type]}`} />
            {EVENT_TYPE_LABELS[type]}
          </span>
        ))}
      </div>

      <div className="mt-6">
        <CalendarGrid monthKey={monthKey} eventsByDay={eventsByDay} />
      </div>
    </div>
  );
}
