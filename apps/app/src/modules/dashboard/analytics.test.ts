import { describe, expect, it } from "vitest";
import { getLastMonths, sumByMonth, countByMonth, countByLabel } from "./analytics";

describe("getLastMonths", () => {
  it("retorna os últimos N meses (UTC), do mais antigo pro mais recente, incluindo o atual", () => {
    const now = new Date(Date.UTC(2026, 2, 15)); // março/2026
    const buckets = getLastMonths(3, now);
    expect(buckets.map((b) => b.label)).toEqual(["jan", "fev", "mar"]);
    expect(buckets[2]).toEqual({ year: 2026, month: 2, label: "mar" });
  });

  it("atravessa a virada de ano corretamente", () => {
    const now = new Date(Date.UTC(2026, 1, 1)); // fevereiro/2026
    const buckets = getLastMonths(3, now);
    expect(buckets.map((b) => `${b.year}-${b.month}`)).toEqual(["2025-11", "2026-0", "2026-1"]);
  });
});

describe("sumByMonth", () => {
  it("soma valores no bucket do mês correto e ignora datas nulas", () => {
    const buckets = getLastMonths(2, new Date(Date.UTC(2026, 1, 1)));
    const rows = [
      { date: new Date(Date.UTC(2026, 0, 10)), value: 100 },
      { date: new Date(Date.UTC(2026, 0, 20)), value: 50 },
      { date: new Date(Date.UTC(2026, 1, 5)), value: 30 },
      { date: null, value: 999 },
    ];
    expect(sumByMonth(rows, buckets)).toEqual([150, 30]);
  });

  it("ignora datas fora do intervalo dos buckets", () => {
    const buckets = getLastMonths(1, new Date(Date.UTC(2026, 1, 1)));
    const rows = [{ date: new Date(Date.UTC(2025, 5, 1)), value: 500 }];
    expect(sumByMonth(rows, buckets)).toEqual([0]);
  });
});

describe("countByMonth", () => {
  it("conta ocorrências por mês", () => {
    const buckets = getLastMonths(2, new Date(Date.UTC(2026, 1, 1)));
    const rows = [
      { date: new Date(Date.UTC(2026, 0, 1)) },
      { date: new Date(Date.UTC(2026, 0, 2)) },
      { date: new Date(Date.UTC(2026, 1, 1)) },
    ];
    expect(countByMonth(rows, buckets)).toEqual([2, 1]);
  });
});

describe("countByLabel", () => {
  it("ordena do maior pro menor", () => {
    const rows = [{ label: "A" }, { label: "B" }, { label: "A" }, { label: "A" }, { label: "B" }];
    expect(countByLabel(rows)).toEqual([
      { label: "A", count: 3 },
      { label: "B", count: 2 },
    ]);
  });

  it("agrupa o excedente além de maxSlots em Outros", () => {
    const rows = ["A", "A", "A", "B", "B", "C", "D", "E", "F"].map((label) => ({ label }));
    const result = countByLabel(rows, 3);
    expect(result).toEqual([
      { label: "A", count: 3 },
      { label: "B", count: 2 },
      { label: "C", count: 1 },
      { label: "Outros", count: 3 },
    ]);
  });
});
