import { describe, it, expect } from "vitest";
import { filledPayments, installmentTitles, moneyToInput, paymentsError, splitTotal, sumPayments } from "./payment-plan";

describe("splitTotal", () => {
  it("divide ao meio (50% + 50%)", () => {
    expect(splitTotal(1000, 2)).toEqual([500, 500]);
  });

  it("joga a diferença de centavos na última parcela e a soma fecha", () => {
    const parts = splitTotal(100, 3);
    expect(parts).toEqual([33.33, 33.33, 33.34]);
    expect(Math.round(parts.reduce((a, b) => a + b, 0) * 100) / 100).toBe(100);
  });

  it("recusa total inválido ou número de parcelas inválido", () => {
    expect(splitTotal(0, 2)).toEqual([]);
    expect(splitTotal(-5, 2)).toEqual([]);
    expect(splitTotal(100, 0)).toEqual([]);
  });
});

describe("installmentTitles / moneyToInput", () => {
  it("dá nomes à entrada e ao final, e numera as demais", () => {
    expect(installmentTitles(2)).toEqual(["Entrada (50%)", "Final (50%)"]);
    expect(installmentTitles(3)).toEqual(["Parcela 1/3", "Parcela 2/3", "Parcela 3/3"]);
    expect(moneyToInput(500)).toBe("500");
    expect(moneyToInput(33.33)).toBe("33.33");
  });
});

describe("sumPayments / filledPayments", () => {
  const rows = [
    { title: "Entrada", value: "500", due: "2026-12-01" },
    { title: "", value: "", due: "" },
    { title: "Final", value: "250,50", due: "2027-01-10" },
  ];
  it("ignora as linhas vazias e entende vírgula", () => {
    expect(filledPayments(rows)).toHaveLength(2);
    expect(sumPayments(rows)).toBe(750.5);
  });
});

describe("paymentsError", () => {
  it("pede a data de cada pagamento com valor", () => {
    expect(paymentsError([{ title: "", value: "500", due: "" }])).toMatch(/data prevista de pagamento/);
    expect(
      paymentsError([
        { title: "", value: "500", due: "2026-12-01" },
        { title: "", value: "500", due: "" },
      ])
    ).toMatch(/pagamento 2/);
  });

  it("não reclama quando está tudo preenchido ou sem valor", () => {
    expect(paymentsError([{ title: "", value: "500", due: "2026-12-01" }])).toBeNull();
    expect(paymentsError([{ title: "", value: "", due: "" }])).toBeNull();
  });
});
