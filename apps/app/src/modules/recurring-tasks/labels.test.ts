import { describe, it, expect } from "vitest";
import { addInterval, isRecurringTaskDue } from "./labels";

describe("addInterval", () => {
  it("SEMANAL soma 7 dias", () => {
    const result = addInterval(new Date("2026-08-20T00:00:00Z"), "SEMANAL");
    expect(result.toISOString()).toBe("2026-08-27T00:00:00.000Z");
  });

  it("MENSAL soma um mês de calendário, mantendo o dia", () => {
    const result = addInterval(new Date("2026-08-15T00:00:00Z"), "MENSAL");
    expect(result.toISOString()).toBe("2026-09-15T00:00:00.000Z");
  });

  it("TRIMESTRAL soma três meses", () => {
    const result = addInterval(new Date("2026-01-31T00:00:00Z"), "TRIMESTRAL");
    // 31 de janeiro + 3 meses: abril só tem 30 dias, JS normaliza pro dia seguinte (1º de maio)
    expect(result.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("SEMESTRAL soma seis meses", () => {
    const result = addInterval(new Date("2026-03-10T00:00:00Z"), "SEMESTRAL");
    expect(result.toISOString()).toBe("2026-09-10T00:00:00.000Z");
  });

  it("ANUAL soma um ano, virando o ano civil", () => {
    const result = addInterval(new Date("2026-12-25T00:00:00Z"), "ANUAL");
    expect(result.toISOString()).toBe("2027-12-25T00:00:00.000Z");
  });
});

describe("isRecurringTaskDue", () => {
  const now = new Date("2026-08-20T12:00:00Z");

  it("é true quando o vencimento já passou e está ativa", () => {
    expect(isRecurringTaskDue(new Date("2026-08-19T00:00:00Z"), true, now)).toBe(true);
  });

  it("é false quando o vencimento ainda não chegou", () => {
    expect(isRecurringTaskDue(new Date("2026-08-21T00:00:00Z"), true, now)).toBe(false);
  });

  it("é false quando está inativa, mesmo com vencimento passado", () => {
    expect(isRecurringTaskDue(new Date("2026-08-19T00:00:00Z"), false, now)).toBe(false);
  });

  it("é true no exato instante do vencimento", () => {
    expect(isRecurringTaskDue(now, true, now)).toBe(true);
  });
});
