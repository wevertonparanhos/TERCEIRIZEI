import { dayKeyFromDate } from "@/modules/calendar/month";

export const EVENT_TYPES = ["recorrente", "prazo_processo", "tarefa", "pagamento", "documento"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  recorrente: "Tarefa recorrente",
  prazo_processo: "Prazo de processo",
  tarefa: "Tarefa",
  pagamento: "Pagamento",
  documento: "Documento solicitado",
};

// classes Tailwind completas (não geradas dinamicamente) para o dot + badge de cada tipo
export const EVENT_TYPE_DOT: Record<EventType, string> = {
  recorrente: "bg-violet-500",
  prazo_processo: "bg-blue-500",
  tarefa: "bg-amber-500",
  pagamento: "bg-emerald-500",
  documento: "bg-rose-500",
};

export type CalendarEvent = {
  id: string;
  type: EventType;
  date: Date;
  title: string;
  clientName: string | null;
  href: string;
  overdue: boolean;
};

export function buildCalendarEvents(
  input: {
    recurringTasks: { id: string; title: string; nextDueAt: Date; clientName: string }[];
    processDeadlines: { id: string; number: number; description: string; requestedDeadline: Date; clientName: string }[];
    tasks: { id: string; title: string; dueAt: Date; processId: string; processNumber: number; clientName: string }[];
    payments: { id: string; number: number; description: string; paymentDueDate: Date; clientName: string }[];
    documentRequests: { id: string; label: string; deadline: Date; clientName: string; processId: string | null }[];
  },
  now: Date = new Date()
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const t of input.recurringTasks) {
    events.push({
      id: `recorrente-${t.id}`,
      type: "recorrente",
      date: t.nextDueAt,
      title: t.title,
      clientName: t.clientName,
      href: "/tarefas-recorrentes",
      overdue: t.nextDueAt.getTime() < now.getTime(),
    });
  }

  for (const p of input.processDeadlines) {
    events.push({
      id: `prazo_processo-${p.id}`,
      type: "prazo_processo",
      date: p.requestedDeadline,
      title: `#${p.number} — ${p.description.slice(0, 40)}`,
      clientName: p.clientName,
      href: `/processos/${p.id}`,
      overdue: p.requestedDeadline.getTime() < now.getTime(),
    });
  }

  for (const t of input.tasks) {
    events.push({
      id: `tarefa-${t.id}`,
      type: "tarefa",
      date: t.dueAt,
      title: `${t.title} (#${t.processNumber})`,
      clientName: t.clientName,
      href: `/processos/${t.processId}`,
      overdue: t.dueAt.getTime() < now.getTime(),
    });
  }

  for (const p of input.payments) {
    events.push({
      id: `pagamento-${p.id}`,
      type: "pagamento",
      date: p.paymentDueDate,
      title: `#${p.number} — ${p.description.slice(0, 40)}`,
      clientName: p.clientName,
      href: `/processos/${p.id}`,
      overdue: p.paymentDueDate.getTime() < now.getTime(),
    });
  }

  for (const d of input.documentRequests) {
    events.push({
      id: `documento-${d.id}`,
      type: "documento",
      date: d.deadline,
      title: d.label,
      clientName: d.clientName,
      href: d.processId ? `/processos/${d.processId}` : "#",
      overdue: d.deadline.getTime() < now.getTime(),
    });
  }

  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = dayKeyFromDate(event.date);
    const existing = map.get(key);
    if (existing) existing.push(event);
    else map.set(key, [event]);
  }
  return map;
}
