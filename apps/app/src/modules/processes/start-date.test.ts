import { describe, it, expect } from "vitest";
import { parseStartDate, startDateToInput } from "./start-date";

const now = new Date("2026-11-03T15:00:00.000Z");

describe("parseStartDate", () => {
  it("guarda o dia escolhido ao meio-dia de Brasília", () => {
    const r = parseStartDate("2026-10-15", now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.date.toISOString()).toBe("2026-10-15T15:00:00.000Z");
      expect(startDateToInput(r.date)).toBe("2026-10-15");
    }
  });

  it("aceita o último dia do mês sem escorregar para o mês seguinte", () => {
    const r = parseStartDate("2026-10-31", now);
    expect(r.ok && startDateToInput(r.date)).toBe("2026-10-31");
  });

  it("recusa data inexistente, vazia, muito antiga ou muito no futuro", () => {
    expect(parseStartDate("2026-02-31", now).ok).toBe(false);
    expect(parseStartDate("", now).ok).toBe(false);
    expect(parseStartDate("2019-12-31", now).ok).toBe(false);
    expect(parseStartDate("2028-01-01", now).ok).toBe(false);
  });
});
