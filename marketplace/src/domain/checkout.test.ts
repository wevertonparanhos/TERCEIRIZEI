import { describe, expect, it } from "vitest";
import { buildCheckoutItems, generateBookingCode, type CatalogAddon, type Offer } from "./checkout";
import { computeQuote } from "./pricing";

const packages = [{ id: "pk1", name: "Básica — até 2 quartos", durationMinutes: 240, professionals: 1 }];
const rules = [{ id: "r1", name: "Área de parede", unitLabel: "m²", minQuantity: 10, maxQuantity: 400, minutesPerUnit: 6, baseMinutes: 60 }];
const addons: CatalogAddon[] = [
  { id: "a1", name: "Forno", pricing: "FIXED", maxQuantity: 1, durationMinutes: 30, unitLabel: null },
  { id: "a2", name: "Janelas", pricing: "PER_UNIT", maxQuantity: 10, durationMinutes: 10, unitLabel: "janela" },
];
const offers: Offer[] = [
  { packageId: "pk1", addonId: null, priceRuleId: null, priceCents: 18_000, baseCents: 0, minTotalCents: 0 },
  { packageId: null, addonId: "a1", priceRuleId: null, priceCents: 3_500, baseCents: 0, minTotalCents: 0 },
  { packageId: null, addonId: "a2", priceRuleId: null, priceCents: 1_000, baseCents: 0, minTotalCents: 0 },
  { packageId: null, addonId: null, priceRuleId: "r1", priceCents: 2_500, baseCents: 0, minTotalCents: 30_000 },
];

describe("montagem do pedido", () => {
  it("pacote + adicionais com preço do profissional e duração somada", () => {
    const items = buildCheckoutItems({ choice: { model: "FIXED", packageId: "pk1", addons: { a1: 1, a2: 3 } }, packages, rules, addons, offers });
    expect(items.lines.map((l) => [l.name, l.unitPriceCents, l.quantity])).toEqual([
      ["Básica — até 2 quartos", 18_000, 1],
      ["Forno", 3_500, 1],
      ["Janelas", 1_000, 3],
    ]);
    expect(items.durationMinutes).toBe(240 + 30 + 30);
    const q = computeQuote({ lines: items.lines, commissionRateBps: 2000, commissionMode: "ON_TOP", discountBearer: "PLATFORM", fee: { bps: 0, fixedCents: 0 }, feeBearer: "PLATFORM" });
    expect(q.totalCents).toBe(29_400); // (180 + 35 + 30) × 1,2
  });

  it("preço calculado respeita mínimo e soma tempo por unidade", () => {
    const items = buildCheckoutItems({ choice: { model: "CALCULATED", ruleId: "r1", quantity: 40, addons: {} }, packages, rules, addons, offers });
    expect(items.lines[0]?.unitPriceCents).toBe(100_000);
    expect(items.durationMinutes).toBe(60 + 240);
  });

  it("recusa pacote que o profissional não oferece, adicional inexistente e quantidades adulteradas", () => {
    const run = (choice: Parameters<typeof buildCheckoutItems>[0]["choice"]) => () => buildCheckoutItems({ choice, packages, rules, addons, offers });
    expect(run({ model: "FIXED", packageId: "outro", addons: {} })).toThrow();
    expect(run({ model: "FIXED", packageId: "pk1", addons: { inexistente: 1 } })).toThrow();
    expect(run({ model: "FIXED", packageId: "pk1", addons: { a1: 2 } })).toThrow(); // fixo só 1
    expect(run({ model: "FIXED", packageId: "pk1", addons: { a2: 11 } })).toThrow();
    expect(run({ model: "FIXED", packageId: "pk1", addons: { a2: -1 } })).toThrow();
    expect(run({ model: "FIXED", packageId: "pk1", addons: { a2: 1.5 } })).toThrow();
    expect(run({ model: "CALCULATED", ruleId: "r1", quantity: 5, addons: {} })).toThrow();
  });
});

describe("código do pedido", () => {
  it("formato legível sem caracteres ambíguos", () => {
    const code = generateBookingCode((n) => new Uint8Array(n).map((_, i) => i * 37));
    expect(code).toMatch(/^LP-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });
});
