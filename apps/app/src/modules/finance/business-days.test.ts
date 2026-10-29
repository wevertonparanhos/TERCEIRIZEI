import { describe, it, expect } from "vitest";
import { billingCycle, easterSunday, holidaysOf, isBusinessDay, lastBusinessDayOfMonth, nthBusinessDayOfMonth } from "@/modules/finance/business-days";

const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("Páscoa e feriados", () => {
  it("calcula a Páscoa de anos conhecidos", () => {
    expect(iso(easterSunday(2025))).toBe("2025-04-20");
    expect(iso(easterSunday(2026))).toBe("2026-04-05");
    expect(iso(easterSunday(2027))).toBe("2027-03-28");
  });

  it("inclui os feriados móveis de 2026", () => {
    const h = holidaysOf(2026);
    expect(h.has("2026-02-16")).toBe(true); // segunda de Carnaval
    expect(h.has("2026-02-17")).toBe(true); // terça de Carnaval
    expect(h.has("2026-04-03")).toBe(true); // Sexta-feira Santa
    expect(h.has("2026-06-04")).toBe(true); // Corpus Christi
  });

  it("Consciência Negra só é feriado nacional a partir de 2024", () => {
    expect(holidaysOf(2023).has("2023-11-20")).toBe(false);
    expect(holidaysOf(2026).has("2026-11-20")).toBe(true);
  });
});

describe("dias úteis", () => {
  it("fim de semana e feriado não são úteis", () => {
    expect(isBusinessDay(new Date("2026-10-31T00:00:00Z"))).toBe(false); // sábado
    expect(isBusinessDay(new Date("2026-11-02T00:00:00Z"))).toBe(false); // Finados (segunda)
    expect(isBusinessDay(new Date("2026-11-03T00:00:00Z"))).toBe(true);
  });

  it("último dia útil: outubro/2026 termina em sábado, então é sexta 30", () => {
    expect(iso(lastBusinessDayOfMonth(2026, 9))).toBe("2026-10-30");
  });

  it("último dia útil de dezembro pula o fim de semana", () => {
    expect(iso(lastBusinessDayOfMonth(2026, 11))).toBe("2026-12-31"); // quinta
  });

  it("5º dia útil de novembro/2026 pula Finados", () => {
    // 3, 4, 5, 6 = 4 dias; 9 (segunda) = 5º
    expect(iso(nthBusinessDayOfMonth(2026, 10, 5))).toBe("2026-11-09");
  });
});

describe("ciclo de cobrança", () => {
  it("outubro/2026: envio dia 30 e vencimento 09/11", () => {
    const { sendDate, dueDate } = billingCycle(2026, 9);
    expect(iso(sendDate)).toBe("2026-10-30");
    expect(iso(dueDate)).toBe("2026-11-09");
  });

  it("dezembro vira o ano: vencimento em janeiro seguinte", () => {
    const { dueDate } = billingCycle(2026, 11);
    expect(iso(dueDate)).toBe("2027-01-08"); // 4, 5, 6, 7, 8 (1/1 feriado; 2-3 fim de semana)
  });

  it("respeita o dia útil configurado na proposta", () => {
    const { dueDate } = billingCycle(2026, 9, 10);
    expect(iso(dueDate)).toBe("2026-11-16");
  });
});
