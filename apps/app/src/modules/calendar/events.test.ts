import { describe, it, expect } from "vitest";
import { buildCalendarEvents, groupEventsByDay } from "@/modules/calendar/events";

describe("buildCalendarEvents", () => {
  it("junta as cinco origens num único array ordenado por data", () => {
    const events = buildCalendarEvents({
      recurringTasks: [{ id: "r1", title: "Enviar relatório", nextDueAt: new Date(Date.UTC(2026, 8, 20)), clientName: "Cliente A" }],
      processDeadlines: [{ id: "p1", number: 10, description: "Abertura", requestedDeadline: new Date(Date.UTC(2026, 8, 5)), clientName: "Cliente B" }],
      tasks: [{ id: "t1", title: "Revisar", dueAt: new Date(Date.UTC(2026, 8, 10)), processId: "p1", processNumber: 10, clientName: "Cliente B" }],
      payments: [{ id: "pay1", number: 11, description: "Consultoria", paymentDueDate: new Date(Date.UTC(2026, 8, 15)), clientName: "Cliente C" }],
      documentRequests: [{ id: "d1", label: "Contrato social", deadline: new Date(Date.UTC(2026, 8, 1)), clientName: "Cliente A", processId: null }],
    });

    expect(events).toHaveLength(5);
    expect(events.map((e) => e.type)).toEqual(["documento", "prazo_processo", "tarefa", "pagamento", "recorrente"]);
  });

  it("marca overdue quando a data já passou", () => {
    const now = new Date(Date.UTC(2026, 8, 10));
    const events = buildCalendarEvents(
      {
        recurringTasks: [{ id: "r1", title: "X", nextDueAt: new Date(Date.UTC(2026, 8, 5)), clientName: "A" }],
        processDeadlines: [],
        tasks: [],
        payments: [],
        documentRequests: [],
      },
      now
    );
    expect(events[0].overdue).toBe(true);
  });

  it("não marca overdue para datas futuras", () => {
    const now = new Date(Date.UTC(2026, 8, 1));
    const events = buildCalendarEvents(
      {
        recurringTasks: [{ id: "r1", title: "X", nextDueAt: new Date(Date.UTC(2026, 8, 5)), clientName: "A" }],
        processDeadlines: [],
        tasks: [],
        payments: [],
        documentRequests: [],
      },
      now
    );
    expect(events[0].overdue).toBe(false);
  });

  it("usa href '#' para documento sem processo vinculado", () => {
    const events = buildCalendarEvents({
      recurringTasks: [],
      processDeadlines: [],
      tasks: [],
      payments: [],
      documentRequests: [{ id: "d1", label: "RG", deadline: new Date(Date.UTC(2026, 8, 1)), clientName: "A", processId: null }],
    });
    expect(events[0].href).toBe("#");
  });
});

describe("groupEventsByDay", () => {
  it("agrupa eventos do mesmo dia sob a mesma chave", () => {
    const events = buildCalendarEvents({
      recurringTasks: [
        { id: "r1", title: "X", nextDueAt: new Date(Date.UTC(2026, 8, 5)), clientName: "A" },
        { id: "r2", title: "Y", nextDueAt: new Date(Date.UTC(2026, 8, 5)), clientName: "B" },
      ],
      processDeadlines: [],
      tasks: [],
      payments: [],
      documentRequests: [],
    });
    const grouped = groupEventsByDay(events);
    expect(grouped.size).toBe(1);
    expect(grouped.get("2026-09-05")).toHaveLength(2);
  });
});
