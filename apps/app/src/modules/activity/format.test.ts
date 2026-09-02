import { describe, it, expect } from "vitest";
import { relativeTime, dayLabel, dayKey, groupLogsByDay } from "@/modules/activity/format";

describe("relativeTime", () => {
  const now = new Date(2026, 8, 2, 12, 0, 0);

  it("mostra 'agora mesmo' para menos de um minuto", () => {
    expect(relativeTime(new Date(2026, 8, 2, 11, 59, 30), now)).toBe("agora mesmo");
  });

  it("mostra minutos até 1 hora", () => {
    expect(relativeTime(new Date(2026, 8, 2, 11, 45, 0), now)).toBe("há 15 minutos");
    expect(relativeTime(new Date(2026, 8, 2, 11, 59, 0), now)).toBe("há 1 minuto");
  });

  it("mostra horas até 24 horas", () => {
    expect(relativeTime(new Date(2026, 8, 2, 9, 0, 0), now)).toBe("há 3 horas");
    expect(relativeTime(new Date(2026, 8, 2, 11, 0, 0), now)).toBe("há 1 hora");
  });

  it("mostra 'ontem' para exatamente 1 dia", () => {
    expect(relativeTime(new Date(2026, 8, 1, 12, 0, 0), now)).toBe("ontem");
  });

  it("mostra dias até 7 dias", () => {
    expect(relativeTime(new Date(2026, 7, 28, 12, 0, 0), now)).toBe("há 5 dias");
  });

  it("cai pra data completa depois de 7 dias", () => {
    expect(relativeTime(new Date(2026, 7, 20, 12, 0, 0), now)).toBe(new Date(2026, 7, 20, 12, 0, 0).toLocaleDateString("pt-BR"));
  });
});

describe("dayLabel", () => {
  const now = new Date(2026, 8, 2, 12, 0, 0);

  it("retorna Hoje pro mesmo dia", () => {
    expect(dayLabel(new Date(2026, 8, 2, 8, 0, 0), now)).toBe("Hoje");
  });

  it("retorna Ontem pro dia anterior", () => {
    expect(dayLabel(new Date(2026, 8, 1, 23, 0, 0), now)).toBe("Ontem");
  });

  it("retorna data por extenso pra dias mais antigos", () => {
    const label = dayLabel(new Date(2026, 7, 20, 8, 0, 0), now);
    expect(label).not.toBe("Hoje");
    expect(label).not.toBe("Ontem");
  });
});

describe("dayKey", () => {
  it("formata ano-mês-dia com zero à esquerda", () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("groupLogsByDay", () => {
  const now = new Date(2026, 8, 2, 12, 0, 0);

  it("agrupa logs consecutivos do mesmo dia sob um único grupo", () => {
    const logs = [
      { id: "1", description: "A", entityType: "client", createdAt: new Date(2026, 8, 2, 10, 0, 0), userName: "X" },
      { id: "2", description: "B", entityType: "client", createdAt: new Date(2026, 8, 2, 9, 0, 0), userName: "X" },
      { id: "3", description: "C", entityType: "client", createdAt: new Date(2026, 8, 1, 9, 0, 0), userName: "X" },
    ];
    const groups = groupLogsByDay(logs, now);
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Hoje");
    expect(groups[0].logs).toHaveLength(2);
    expect(groups[1].label).toBe("Ontem");
    expect(groups[1].logs).toHaveLength(1);
  });

  it("preserva a ordem original dentro de cada grupo", () => {
    const logs = [
      { id: "1", description: "mais recente", entityType: "client", createdAt: new Date(2026, 8, 2, 11, 0, 0), userName: "X" },
      { id: "2", description: "mais antigo", entityType: "client", createdAt: new Date(2026, 8, 2, 9, 0, 0), userName: "X" },
    ];
    const groups = groupLogsByDay(logs, now);
    expect(groups[0].logs.map((l) => l.description)).toEqual(["mais recente", "mais antigo"]);
  });

  it("retorna array vazio pra lista vazia", () => {
    expect(groupLogsByDay([], now)).toEqual([]);
  });
});
