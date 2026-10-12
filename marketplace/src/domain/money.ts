/**
 * Dinheiro é sempre um inteiro em centavos. Percentuais são basis points
 * (1 bps = 0,01%; 2000 bps = 20%). Nenhuma conta financeira usa float.
 */
export type Cents = number;
export type Bps = number;

export const BPS_100_PERCENT = 10_000;

export function assertCents(value: number, label = "valor"): asserts value is Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} inválido: esperado inteiro de centavos ≥ 0, recebido ${value}.`);
  }
}

export function assertBps(value: number, label = "percentual"): asserts value is Bps {
  if (!Number.isInteger(value) || value < 0 || value > BPS_100_PERCENT) {
    throw new RangeError(`${label} inválido: esperado 0–10000 bps, recebido ${value}.`);
  }
}

/**
 * amount × bps / 10000, arredondado "meio para cima" (half-up) com aritmética
 * inteira em BigInt — exato para qualquer valor.
 */
export function applyBps(amount: Cents, bps: Bps): Cents {
  assertCents(amount, "valor base");
  assertBps(bps);
  const product = BigInt(amount) * BigInt(bps);
  const rounded = (product + 5_000n) / 10_000n;
  return Number(rounded);
}

/**
 * Divide `amount` proporcionalmente a `part / whole`, arredondando half-up.
 * Usado para repartir descontos/taxas entre plataforma e prestador.
 */
export function prorate(amount: Cents, part: Cents, whole: Cents): Cents {
  assertCents(amount);
  assertCents(part);
  assertCents(whole);
  if (whole === 0) return 0;
  const numerator = BigInt(amount) * BigInt(part) * 2n + BigInt(whole);
  return Number(numerator / (BigInt(whole) * 2n));
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(cents: Cents): string {
  return brl.format(cents / 100);
}

export function formatBps(bps: Bps): string {
  const value = bps / 100;
  return `${Number.isInteger(value) ? value : value.toFixed(2).replace(".", ",")}%`;
}

/** "R$ 1.234,56" / "1234,56" / "1234.56" → centavos. Retorna null se inválido. */
export function parseBRLToCents(input: string): Cents | null {
  const cleaned = input.replace(/[R$\s]/g, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) normalized = cleaned.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [int, frac = ""] = normalized.split(".");
  const cents = Number(int) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
