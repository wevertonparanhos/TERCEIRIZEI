import { describe, expect, it } from "vitest";
import { applyBps, formatBRL, parseBRLToCents, prorate } from "./money";
import { calculatedLine, computeQuote, customerPrice, PricingError, type QuoteInput } from "./pricing";

const base: Omit<QuoteInput, "lines"> = {
  commissionRateBps: 2000,
  commissionMode: "ON_TOP",
  discountBearer: "PLATFORM",
  fee: { bps: 0, fixedCents: 0 },
  feeBearer: "PLATFORM",
};

const pkg = (cents: number) => ({ kind: "PACKAGE" as const, refId: "p1", name: "Pacote", unitPriceCents: cents, quantity: 1 });

describe("money", () => {
  it("aplica bps com arredondamento half-up inteiro", () => {
    expect(applyBps(20_000, 2000)).toBe(4_000);
    expect(applyBps(1, 5000)).toBe(1); // 0,5 centavo → 1
    expect(applyBps(3, 3333)).toBe(1); // 0,9999 → 1
    expect(applyBps(999_999_999, 2000)).toBe(200_000_000); // 199.999.999,8 → sem erro de float
  });

  it("rateia proporcionalmente sem float", () => {
    expect(prorate(1000, 1, 3)).toBe(333);
    expect(prorate(1000, 2, 3)).toBe(667);
    expect(prorate(100, 0, 0)).toBe(0);
  });

  it("formata e interpreta BRL", () => {
    expect(formatBRL(24_000)).toMatch(/R\$\s?240,00/);
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123_456);
    expect(parseBRLToCents("200")).toBe(20_000);
    expect(parseBRLToCents("12.5")).toBe(1_250);
    expect(parseBRLToCents("abc")).toBeNull();
    expect(parseBRLToCents("1,234")).toBeNull();
  });
});

describe("computeQuote — comissão acrescida (regra do negócio)", () => {
  it("prestador cobra R$ 200 → cliente paga R$ 240, plataforma R$ 40, prestador R$ 200", () => {
    const q = computeQuote({ ...base, lines: [pkg(20_000)] });
    expect(q.providerSubtotalCents).toBe(20_000);
    expect(q.commissionCents).toBe(4_000);
    expect(q.totalCents).toBe(24_000);
    expect(q.providerNetCents).toBe(20_000);
    expect(q.platformNetCents).toBe(4_000);
  });

  it("soma pacote + adicionais com quantidade antes de aplicar a comissão", () => {
    const q = computeQuote({
      ...base,
      lines: [
        pkg(18_000),
        { kind: "ADDON", refId: "a1", name: "Forno", unitPriceCents: 3_500, quantity: 1 },
        { kind: "ADDON", refId: "a2", name: "Janela", unitPriceCents: 1_000, quantity: 3 },
      ],
    });
    expect(q.providerSubtotalCents).toBe(24_500);
    expect(q.commissionCents).toBe(4_900);
    expect(q.totalCents).toBe(29_400);
    expect(q.lines.map((l) => l.totalCents)).toEqual([18_000, 3_500, 3_000]);
  });

  it("comissão configurável (ex.: 15% por categoria)", () => {
    const q = computeQuote({ ...base, commissionRateBps: 1500, lines: [pkg(20_000)] });
    expect(q.commissionCents).toBe(3_000);
    expect(q.totalCents).toBe(23_000);
  });
});

describe("computeQuote — comissão embutida (exemplo do briefing)", () => {
  it("R$ 200 → comissão R$ 40, prestador R$ 160", () => {
    const q = computeQuote({ ...base, commissionMode: "INCLUDED", lines: [pkg(20_000)] });
    expect(q.totalCents).toBe(20_000);
    expect(q.commissionCents).toBe(4_000);
    expect(q.providerNetCents).toBe(16_000);
    expect(q.platformNetCents).toBe(4_000);
  });
});

describe("computeQuote — descontos e taxas", () => {
  it("cupom suportado pela plataforma não reduz o valor do prestador", () => {
    const q = computeQuote({ ...base, lines: [pkg(20_000)], discount: { type: "FIXED", amountCents: 3_000 } });
    expect(q.totalCents).toBe(21_000);
    expect(q.providerNetCents).toBe(20_000);
    expect(q.platformNetCents).toBe(1_000);
  });

  it("cupom proporcional divide o desconto pela participação de cada parte", () => {
    const q = computeQuote({
      ...base,
      discountBearer: "PROPORTIONAL",
      lines: [pkg(20_000)],
      discount: { type: "PERCENT", percentBps: 1000 },
    });
    expect(q.discountCents).toBe(2_400); // 10% de 240
    expect(q.totalCents).toBe(21_600);
    expect(q.providerNetCents).toBe(18_000); // 200 − 20
    expect(q.platformNetCents).toBe(3_600); // 40 − 4
  });

  it("desconto nunca passa do valor bruto", () => {
    const q = computeQuote({ ...base, lines: [pkg(1_000)], discount: { type: "FIXED", amountCents: 99_999 } });
    expect(q.discountCents).toBe(1_200);
    expect(q.totalCents).toBe(0);
    expect(q.feeCents).toBe(0);
  });

  it("taxa do provedor é contabilizada separadamente e pode ser repassada ao prestador", () => {
    const q = computeQuote({ ...base, lines: [pkg(20_000)], fee: { bps: 100, fixedCents: 50 }, feeBearer: "PROVIDER" });
    expect(q.feeCents).toBe(290); // 1% de 240 + 0,50
    expect(q.providerNetCents).toBe(19_710);
    expect(q.platformNetCents).toBe(4_000);
  });

  it("invariante: total = líquido do prestador + líquido da plataforma + taxa (vários cenários)", () => {
    const bearers = ["PLATFORM", "PROVIDER", "PROPORTIONAL"] as const;
    for (const mode of ["ON_TOP", "INCLUDED"] as const)
      for (const db of bearers)
        for (const fb of bearers)
          for (const price of [1, 99, 12_345, 20_000, 987_654]) {
            const q = computeQuote({
              commissionRateBps: 1777,
              commissionMode: mode,
              discountBearer: db,
              feeBearer: fb,
              fee: { bps: 499, fixedCents: 39 },
              discount: { type: "PERCENT", percentBps: 1234 },
              lines: [pkg(price)],
            });
            expect(q.providerNetCents + q.platformNetCents + q.feeCents).toBe(q.totalCents);
            expect(q.totalCents).toBe(q.grossCents - q.discountCents);
            expect(q.providerNetCents).toBeGreaterThanOrEqual(0);
            for (const v of Object.values(q)) if (typeof v === "number") expect(Number.isInteger(v)).toBe(true);
          }
  });
});

describe("validações", () => {
  it("rejeita preço fracionado, negativo ou quantidade inválida", () => {
    expect(() => computeQuote({ ...base, lines: [pkg(100.5)] })).toThrow();
    expect(() => computeQuote({ ...base, lines: [pkg(-1)] })).toThrow();
    expect(() => computeQuote({ ...base, lines: [{ ...pkg(100), quantity: 0 }] })).toThrow(PricingError);
    expect(() => computeQuote({ ...base, lines: [] })).toThrow(PricingError);
    expect(() => computeQuote({ ...base, commissionRateBps: 10_001, lines: [pkg(100)] })).toThrow();
  });
});

describe("preço exibido e preço calculado", () => {
  it("preço ao cliente = preço do prestador + comissão", () => {
    expect(customerPrice(18_000, 2000, "ON_TOP")).toBe(21_600);
    expect(customerPrice(18_000, 2000, "INCLUDED")).toBe(18_000);
  });

  it("preço calculado = base + unidades × preço, com mínimo", () => {
    const rule = { minQuantity: 10, maxQuantity: 400, unitLabel: "m²" };
    expect(calculatedLine("r", "Pintura", rule, { unitPriceCents: 2_500, baseCents: 0, minTotalCents: 30_000 }, 40).unitPriceCents).toBe(100_000);
    expect(calculatedLine("r", "Pintura", rule, { unitPriceCents: 2_500, baseCents: 0, minTotalCents: 30_000 }, 10).unitPriceCents).toBe(30_000);
    expect(calculatedLine("r", "Grama", rule, { unitPriceCents: 300, baseCents: 5_000, minTotalCents: 0 }, 100).unitPriceCents).toBe(35_000);
    expect(() => calculatedLine("r", "Pintura", rule, { unitPriceCents: 1, baseCents: 0, minTotalCents: 0 }, 9)).toThrow(PricingError);
  });
});
