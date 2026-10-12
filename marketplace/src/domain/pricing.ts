import { applyBps, assertBps, assertCents, prorate, type Bps, type Cents } from "./money";

/**
 * Motor central de preços. Função pura: recebe os preços DO PRESTADOR e as
 * regras vigentes, devolve a composição completa que será exibida ao cliente
 * e congelada no pedido (snapshot). O servidor sempre recalcula — valores
 * vindos do navegador nunca são aceitos.
 */

export type CommissionMode = "ON_TOP" | "INCLUDED";
export type CostBearer = "PLATFORM" | "PROVIDER" | "PROPORTIONAL";

export type PriceLine = {
  kind: "PACKAGE" | "ADDON" | "CALCULATED";
  refId: string;
  name: string;
  /** Preço do prestador por unidade. */
  unitPriceCents: Cents;
  quantity: number;
};

export type Discount =
  | { type: "PERCENT"; percentBps: Bps; code?: string }
  | { type: "FIXED"; amountCents: Cents; code?: string };

export type FeeConfig = { bps: Bps; fixedCents: Cents };

export type QuoteInput = {
  lines: PriceLine[];
  commissionRateBps: Bps;
  commissionMode: CommissionMode;
  discount?: Discount | null;
  discountBearer: CostBearer;
  /** Taxa ESTIMADA do provedor de pagamento (0 até haver contrato real). */
  fee: FeeConfig;
  feeBearer: CostBearer;
};

export type QuoteLine = PriceLine & { totalCents: Cents };

export type Quote = {
  lines: QuoteLine[];
  /** Soma dos preços do prestador. */
  providerSubtotalCents: Cents;
  commissionRateBps: Bps;
  commissionMode: CommissionMode;
  commissionCents: Cents;
  /** Valor antes do desconto (o que o cliente pagaria sem cupom). */
  grossCents: Cents;
  discountCents: Cents;
  /** Valor cobrado do cliente. */
  totalCents: Cents;
  /** Parte do prestador antes de descontos e taxas. */
  providerShareCents: Cents;
  feeCents: Cents;
  discountBearer: CostBearer;
  feeBearer: CostBearer;
  /** Quanto o prestador efetivamente recebe. */
  providerNetCents: Cents;
  /** Quanto a plataforma efetivamente retém. */
  platformNetCents: Cents;
};

export class PricingError extends Error {}

function lineTotal(line: PriceLine): Cents {
  assertCents(line.unitPriceCents, `preço de "${line.name}"`);
  if (!Number.isInteger(line.quantity) || line.quantity < 1) {
    throw new PricingError(`Quantidade inválida para "${line.name}".`);
  }
  const total = line.unitPriceCents * line.quantity;
  assertCents(total, `total de "${line.name}"`);
  return total;
}

function discountAmount(discount: Discount | null | undefined, grossCents: Cents): Cents {
  if (!discount) return 0;
  const raw =
    discount.type === "PERCENT"
      ? applyBps(grossCents, discount.percentBps)
      : (assertCents(discount.amountCents, "desconto"), discount.amountCents);
  return Math.min(raw, grossCents);
}

/** Reparte `amount` entre prestador e plataforma conforme quem suporta o custo. */
function split(amount: Cents, bearer: CostBearer, providerShare: Cents, base: Cents) {
  if (bearer === "PLATFORM") return { provider: 0, platform: amount };
  if (bearer === "PROVIDER") {
    const provider = Math.min(amount, providerShare);
    return { provider, platform: amount - provider };
  }
  const provider = Math.min(prorate(amount, providerShare, base), providerShare);
  return { provider, platform: amount - provider };
}

export function computeQuote(input: QuoteInput): Quote {
  assertBps(input.commissionRateBps, "comissão");
  if (input.lines.length === 0) throw new PricingError("Nenhum item selecionado.");

  const lines = input.lines.map((line) => ({ ...line, totalCents: lineTotal(line) }));
  const providerSubtotalCents = lines.reduce((sum, l) => sum + l.totalCents, 0);
  assertCents(providerSubtotalCents, "subtotal");

  const commissionCents = applyBps(providerSubtotalCents, input.commissionRateBps);
  const onTop = input.commissionMode === "ON_TOP";
  const grossCents = onTop ? providerSubtotalCents + commissionCents : providerSubtotalCents;
  const providerShareCents = onTop ? providerSubtotalCents : providerSubtotalCents - commissionCents;

  const discountCents = discountAmount(input.discount, grossCents);
  const totalCents = grossCents - discountCents;

  assertBps(input.fee.bps, "taxa do provedor");
  assertCents(input.fee.fixedCents, "taxa fixa do provedor");
  const feeCents = totalCents === 0 ? 0 : Math.min(totalCents, applyBps(totalCents, input.fee.bps) + input.fee.fixedCents);

  const discountSplit = split(discountCents, input.discountBearer, providerShareCents, grossCents);
  const providerAfterDiscount = providerShareCents - discountSplit.provider;
  const feeSplit = split(feeCents, input.feeBearer, providerAfterDiscount, totalCents);

  const providerNetCents = providerAfterDiscount - feeSplit.provider;
  const platformNetCents = totalCents - feeCents - providerNetCents;

  return {
    lines,
    providerSubtotalCents,
    commissionRateBps: input.commissionRateBps,
    commissionMode: input.commissionMode,
    commissionCents,
    grossCents,
    discountCents,
    totalCents,
    providerShareCents,
    feeCents,
    discountBearer: input.discountBearer,
    feeBearer: input.feeBearer,
    providerNetCents,
    platformNetCents,
  };
}

/** Preço que o cliente vê para um item, dado o preço do prestador. */
export function customerPrice(providerPriceCents: Cents, commissionRateBps: Bps, mode: CommissionMode): Cents {
  assertCents(providerPriceCents);
  return mode === "ON_TOP" ? providerPriceCents + applyBps(providerPriceCents, commissionRateBps) : providerPriceCents;
}

export type CalculatedOffer = { unitPriceCents: Cents; baseCents: Cents; minTotalCents: Cents };
export type CalculatedRule = { minQuantity: number; maxQuantity: number; unitLabel: string };

/**
 * Preço calculado (m², hora...): base + quantidade × preço unitário, respeitando
 * o mínimo do prestador. Devolve UMA linha com quantidade 1 e preço já somado,
 * para entrar no motor como qualquer outro item.
 */
export function calculatedLine(
  refId: string,
  name: string,
  rule: CalculatedRule,
  offer: CalculatedOffer,
  quantity: number,
): PriceLine {
  if (!Number.isInteger(quantity) || quantity < rule.minQuantity || quantity > rule.maxQuantity) {
    throw new PricingError(
      `Quantidade deve estar entre ${rule.minQuantity} e ${rule.maxQuantity} ${rule.unitLabel}.`,
    );
  }
  assertCents(offer.unitPriceCents);
  assertCents(offer.baseCents);
  assertCents(offer.minTotalCents);
  const raw = offer.baseCents + offer.unitPriceCents * quantity;
  return {
    kind: "CALCULATED",
    refId,
    name: `${name} (${quantity} ${rule.unitLabel})`,
    unitPriceCents: Math.max(raw, offer.minTotalCents),
    quantity: 1,
  };
}
