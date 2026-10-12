import { calculatedLine, PricingError, type PriceLine } from "./pricing";

/**
 * Monta os itens de um pedido a partir das ESCOLHAS do cliente e das OFERTAS
 * do profissional. Preços vêm sempre das ofertas (servidor); do navegador só
 * chegam ids e quantidades.
 */

export type CatalogPackage = { id: string; name: string; durationMinutes: number; professionals: number };
export type CatalogAddon = { id: string; name: string; pricing: "FIXED" | "PER_UNIT"; maxQuantity: number; durationMinutes: number; unitLabel: string | null };
export type CatalogRule = { id: string; name: string; unitLabel: string; minQuantity: number; maxQuantity: number; minutesPerUnit: number; baseMinutes: number };
export type Offer = { packageId: string | null; addonId: string | null; priceRuleId: string | null; priceCents: number; baseCents: number; minTotalCents: number };

export type CheckoutChoice =
  | { model: "FIXED"; packageId: string; addons: Record<string, number> }
  | { model: "CALCULATED"; ruleId: string; quantity: number; addons: Record<string, number> };

export type CheckoutItems = { lines: PriceLine[]; durationMinutes: number; packageId: string | null; summary: string };

export function buildCheckoutItems(params: {
  choice: CheckoutChoice;
  packages: CatalogPackage[];
  rules: CatalogRule[];
  addons: CatalogAddon[];
  offers: Offer[];
}): CheckoutItems {
  const { choice, packages, rules, addons, offers } = params;
  const lines: PriceLine[] = [];
  let durationMinutes: number;
  let summary: string;
  let packageId: string | null = null;

  if (choice.model === "FIXED") {
    const pkg = packages.find((p) => p.id === choice.packageId);
    const offer = offers.find((o) => o.packageId === choice.packageId);
    if (!pkg || !offer) throw new PricingError("Este profissional não oferece o pacote escolhido.");
    lines.push({ kind: "PACKAGE", refId: pkg.id, name: pkg.name, unitPriceCents: offer.priceCents, quantity: 1 });
    durationMinutes = pkg.durationMinutes;
    summary = pkg.name;
    packageId = pkg.id;
  } else {
    const rule = rules.find((r) => r.id === choice.ruleId);
    const offer = offers.find((o) => o.priceRuleId === choice.ruleId);
    if (!rule || !offer) throw new PricingError("Este profissional não oferece este serviço.");
    lines.push(
      calculatedLine(rule.id, rule.name, rule, { unitPriceCents: offer.priceCents, baseCents: offer.baseCents, minTotalCents: offer.minTotalCents }, choice.quantity),
    );
    durationMinutes = rule.baseMinutes + rule.minutesPerUnit * choice.quantity;
    summary = `${rule.name}: ${choice.quantity} ${rule.unitLabel}`;
  }

  for (const [addonId, rawQty] of Object.entries(choice.addons)) {
    if (!rawQty) continue;
    const addon = addons.find((a) => a.id === addonId);
    const offer = offers.find((o) => o.addonId === addonId);
    if (!addon || !offer) throw new PricingError("Adicional indisponível para este profissional.");
    const max = addon.pricing === "FIXED" ? 1 : addon.maxQuantity;
    if (!Number.isInteger(rawQty) || rawQty < 1 || rawQty > max) {
      throw new PricingError(`Quantidade inválida para "${addon.name}" (máximo ${max}).`);
    }
    lines.push({ kind: "ADDON", refId: addon.id, name: addon.name, unitPriceCents: offer.priceCents, quantity: rawQty });
    durationMinutes += addon.durationMinutes * rawQty;
  }

  return { lines, durationMinutes: Math.max(durationMinutes, 30), packageId, summary };
}

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0/O/1/I/L

/** Código legível do pedido (ex.: "LP-7KX9-2MQ4"). */
export function generateBookingCode(random: (n: number) => Uint8Array): string {
  const bytes = random(8);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `LP-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}
