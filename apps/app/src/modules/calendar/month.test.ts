import { describe, it, expect } from "vitest";
import {
  monthKeyFromDate,
  resolveMonthKey,
  shiftMonthKey,
  dayKeyFromDate,
  getMonthGrid,
  getMonthGridRange,
} from "@/modules/calendar/month";

describe("monthKeyFromDate", () => {
  it("formata ano-mês com zero à esquerda", () => {
    expect(monthKeyFromDate(new Date(Date.UTC(2026, 0, 15)))).toBe("2026-01");
    expect(monthKeyFromDate(new Date(Date.UTC(2026, 11, 1)))).toBe("2026-12");
  });
});

describe("resolveMonthKey", () => {
  it("aceita uma chave válida", () => {
    expect(resolveMonthKey("2026-03")).toBe("2026-03");
  });
  it("cai para o mês atual se ausente ou inválida", () => {
    const now = new Date(Date.UTC(2026, 8, 2));
    expect(resolveMonthKey(undefined, now)).toBe("2026-09");
    expect(resolveMonthKey("lixo", now)).toBe("2026-09");
  });
});

describe("shiftMonthKey", () => {
  it("avança e retrocede, cruzando o limite do ano", () => {
    expect(shiftMonthKey("2026-09", 1)).toBe("2026-10");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
  });
});

describe("dayKeyFromDate", () => {
  it("formata ano-mês-dia", () => {
    expect(dayKeyFromDate(new Date(Date.UTC(2026, 8, 5)))).toBe("2026-09-05");
  });
});

describe("getMonthGrid", () => {
  it("retorna 42 dias começando no domingo", () => {
    const grid = getMonthGrid("2026-09");
    expect(grid).toHaveLength(42);
    expect(grid[0].date.getUTCDay()).toBe(0);
    expect(grid[41].date.getUTCDay()).toBe(6);
  });

  it("marca corretamente os dias dentro/fora do mês", () => {
    const grid = getMonthGrid("2026-09");
    const inMonthCount = grid.filter((d) => d.inMonth).length;
    expect(inMonthCount).toBe(30);
  });

  it("marca isToday apenas para a data informada", () => {
    const now = new Date(Date.UTC(2026, 8, 15));
    const grid = getMonthGrid("2026-09", now);
    const todayDays = grid.filter((d) => d.isToday);
    expect(todayDays).toHaveLength(1);
    expect(todayDays[0].dayKey).toBe("2026-09-15");
  });
});

describe("getMonthGridRange", () => {
  it("cobre do primeiro ao último dia exibido na grade", () => {
    const grid = getMonthGrid("2026-09");
    const { start, end } = getMonthGridRange("2026-09");
    expect(start.getTime()).toBe(grid[0].date.getTime());
    expect(end.getUTCDate()).toBe(grid[41].date.getUTCDate());
    expect(end.getUTCHours()).toBe(23);
  });
});
