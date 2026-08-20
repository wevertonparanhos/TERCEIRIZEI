import { describe, it, expect } from "vitest";
import { resolvePeriod, summarizePayments } from "./period";

const REF_NOW = new Date("2026-08-20T15:00:00Z"); // quinta-feira

describe("resolvePeriod", () => {
  it("hoje cobre só o dia atual (UTC)", () => {
    const { start, end } = resolvePeriod("hoje", undefined, undefined, REF_NOW);
    expect(start.toISOString()).toBe("2026-08-20T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-20T23:59:59.999Z");
  });

  it("mes cobre o mês corrente inteiro, incluindo dias futuros", () => {
    const { start, end } = resolvePeriod("mes", undefined, undefined, REF_NOW);
    expect(start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-31T23:59:59.999Z");
  });

  it("semana cobre a semana inteira (domingo a sábado), incluindo dias futuros", () => {
    // REF_NOW = 2026-08-20 é uma quinta-feira
    const { start, end } = resolvePeriod("semana", undefined, undefined, REF_NOW);
    expect(start.toISOString()).toBe("2026-08-16T00:00:00.000Z"); // domingo
    expect(end.toISOString()).toBe("2026-08-22T23:59:59.999Z"); // sábado
  });

  it("30dias continua limitado a hoje (janela retroativa, não o mês inteiro)", () => {
    const { start, end } = resolvePeriod("30dias", undefined, undefined, REF_NOW);
    expect(end.toISOString()).toBe("2026-08-20T23:59:59.999Z");
    expect(start.toISOString()).toBe("2026-07-21T00:00:00.000Z");
  });

  it("mes_passado cobre o mês inteiro anterior", () => {
    const { start, end } = resolvePeriod("mes_passado", undefined, undefined, REF_NOW);
    expect(start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-07-31T23:59:59.999Z");
  });

  it("mes_passado em janeiro volta pro dezembro do ano anterior", () => {
    const jan = new Date("2026-01-15T12:00:00Z");
    const { start, end } = resolvePeriod("mes_passado", undefined, undefined, jan);
    expect(start.toISOString()).toBe("2025-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2025-12-31T23:59:59.999Z");
  });

  it("ano cobre o ano inteiro, incluindo meses futuros", () => {
    const { start, end } = resolvePeriod("ano", undefined, undefined, REF_NOW);
    expect(start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T23:59:59.999Z");
  });

  it("personalizado usa as datas informadas", () => {
    const { start, end } = resolvePeriod("personalizado", "2026-08-05", "2026-08-10", REF_NOW);
    expect(start.toISOString()).toBe("2026-08-05T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-10T23:59:59.999Z");
  });
});

describe("summarizePayments", () => {
  it("soma recebido, pendente e atrasado corretamente", () => {
    const now = new Date("2026-08-20T12:00:00Z");
    const summary = summarizePayments(
      [
        { value: 100, paymentDueDate: new Date("2026-08-25"), paidAt: null }, // pendente
        { value: 200, paymentDueDate: new Date("2026-08-01"), paidAt: null }, // atrasado
        { value: 300, paymentDueDate: new Date("2026-08-01"), paidAt: new Date("2026-08-05") }, // recebido
      ],
      now
    );
    expect(summary).toEqual({ total: 600, recebido: 300, pendente: 100, atrasado: 200, count: 3 });
  });

  it("conta como pendente quando não há data de pagamento definida", () => {
    const summary = summarizePayments([{ value: 50, paymentDueDate: null, paidAt: null }]);
    expect(summary.pendente).toBe(50);
    expect(summary.atrasado).toBe(0);
  });

  it("lista vazia retorna tudo zerado", () => {
    expect(summarizePayments([])).toEqual({ total: 0, recebido: 0, pendente: 0, atrasado: 0, count: 0 });
  });
});
