import { describe, it, expect } from "vitest";
import { computeCumulativeDueDates } from "./step-scheduling";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("computeCumulativeDueDates", () => {
  it("retorna array vazio pra lista de etapas vazia", () => {
    expect(computeCumulativeDueDates([], new Date("2026-01-01"))).toEqual([]);
  });

  it("prazo cumulativo: etapa N soma a partir do prazo da etapa N-1, não do início do processo", () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const steps = [{ estimatedDays: 1 }, { estimatedDays: 2 }, { estimatedDays: 5 }];
    const dueDates = computeCumulativeDueDates(steps, startedAt);

    expect(dueDates[0]).toEqual(new Date(startedAt.getTime() + 1 * DAY_MS));
    expect(dueDates[1]).toEqual(new Date(startedAt.getTime() + 3 * DAY_MS));
    expect(dueDates[2]).toEqual(new Date(startedAt.getTime() + 8 * DAY_MS));
    // a última etapa nunca pode vencer antes da primeira (bug real da Fase 4)
    expect(dueDates[2]!.getTime()).toBeGreaterThan(dueDates[0]!.getTime());
  });

  it("etapa sem estimatedDays fica com dueDate null mas não reseta o cursor pras próximas", () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const steps = [{ estimatedDays: 2 }, { estimatedDays: null }, { estimatedDays: 3 }];
    const dueDates = computeCumulativeDueDates(steps, startedAt);

    expect(dueDates[0]).toEqual(new Date(startedAt.getTime() + 2 * DAY_MS));
    expect(dueDates[1]).toBeNull();
    expect(dueDates[2]).toEqual(new Date(startedAt.getTime() + 5 * DAY_MS));
  });

  it("estimatedDays 0 é tratado como sem prazo (falsy), igual a null", () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const dueDates = computeCumulativeDueDates([{ estimatedDays: 0 }], startedAt);
    expect(dueDates[0]).toBeNull();
  });
});
