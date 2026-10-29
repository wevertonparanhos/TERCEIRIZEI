import { describe, it, expect } from "vitest";
import { buildCashflow, daysOverdue, groupUpcomingByWeek, pctChange, previousRange, topClients, type FlowRow } from "./dashboard";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("previousRange", () => {
  it("devolve o período imediatamente anterior com os mesmos dias", () => {
    const r = previousRange(d("2026-10-01"), d("2026-10-31"));
    expect(r.start.toISOString().slice(0, 10)).toBe("2026-08-31");
    expect(r.end.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("funciona para um dia só", () => {
    const r = previousRange(d("2026-10-29"), d("2026-10-29"));
    expect(r.start.toISOString().slice(0, 10)).toBe("2026-10-28");
    expect(r.end.toISOString().slice(0, 10)).toBe("2026-10-28");
  });
});

describe("pctChange", () => {
  it("calcula a variação e some sem base", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(10, 0)).toBeNull();
  });
});

const rows: FlowRow[] = [
  { clientId: "a", clientName: "Ana", value: 100, paymentDueDate: d("2026-10-02"), paidAt: d("2026-10-02") },
  { clientId: "a", clientName: "Ana", value: 50, paymentDueDate: d("2026-10-02"), paidAt: null },
  { clientId: "b", clientName: "Bia", value: 200, paymentDueDate: d("2026-10-04"), paidAt: null },
  { clientId: "c", clientName: "Caio", value: 30, paymentDueDate: null, paidAt: null },
];

describe("buildCashflow", () => {
  it("soma recebido e pendente por dia e acumula o total", () => {
    const points = buildCashflow(rows, d("2026-10-01"), d("2026-10-05"));
    expect(points.map((p) => p.label)).toEqual(["01/10", "02/10", "03/10", "04/10", "05/10"]);
    expect(points[1]).toMatchObject({ recebido: 100, pendente: 50, acumulado: 150 });
    expect(points[3]).toMatchObject({ recebido: 0, pendente: 200, acumulado: 350 });
    expect(points[4].acumulado).toBe(350);
  });

  it("agrupa por mês em períodos longos e ignora linhas sem vencimento", () => {
    const points = buildCashflow(rows, d("2026-01-01"), d("2026-12-31"));
    expect(points).toHaveLength(12);
    expect(points[9]).toMatchObject({ label: "10/26", recebido: 100, pendente: 250 });
  });
});

describe("groupUpcomingByWeek", () => {
  it("agrupa em semanas de domingo a sábado, em ordem", () => {
    const groups = groupUpcomingByWeek([
      { id: "1", label: "A", clientName: "Ana", dueDate: d("2026-11-06"), value: 150 },
      { id: "2", label: "B", clientName: "Bia", dueDate: d("2026-10-29"), value: 200 },
      { id: "3", label: "C", clientName: "Caio", dueDate: d("2026-10-30"), value: 100 },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].total).toBe(300);
    expect(groups[0].items.map((i) => i.id)).toEqual(["2", "3"]);
    expect(groups[0].title).toBe("25 de out – 31 de out");
    expect(groups[1].title).toBe("1 de nov – 7 de nov");
  });
});

describe("topClients", () => {
  it("ordena por valor total e separa recebido de pendente", () => {
    const top = topClients(rows);
    expect(top.map((c) => c.clientName)).toEqual(["Bia", "Ana", "Caio"]);
    expect(top[1]).toMatchObject({ count: 2, recebido: 100, pendente: 50, total: 150 });
  });
});

describe("daysOverdue", () => {
  it("conta os dias de atraso e nunca fica negativo", () => {
    expect(daysOverdue(d("2026-10-26"), d("2026-10-29"))).toBe(3);
    expect(daysOverdue(d("2026-11-02"), d("2026-10-29"))).toBe(0);
  });
});
