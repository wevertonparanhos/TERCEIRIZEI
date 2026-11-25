/** Plano de pagamento da Nova Tarefa: vários pagamentos com datas diferentes (ex.: 50% no início e 50% no final). */

import { parseMoneyInput } from "@/modules/processes/text-input";

export type PaymentRow = { title: string; value: string; due: string };

export const MAX_PAYMENTS = 24;

export const emptyPayment = (): PaymentRow => ({ title: "", value: "", due: "" });

/** Divide um total em N partes iguais, em centavos; a diferença de arredondamento vai para a última parcela. */
export function splitTotal(total: number, parts: number): number[] {
  if (!Number.isFinite(total) || total <= 0 || !Number.isInteger(parts) || parts < 1) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const result = Array.from({ length: parts }, () => base);
  result[parts - 1] += cents - base * parts;
  return result.map((c) => c / 100);
}

/** Título sugerido de cada parcela quando o valor é dividido (2 partes viram "Entrada" e "Final"). */
export function installmentTitles(parts: number): string[] {
  if (parts === 2) return ["Entrada (50%)", "Final (50%)"];
  return Array.from({ length: parts }, (_, i) => `Parcela ${i + 1}/${parts}`);
}

/** Valor com ponto decimal para o campo numérico (500 -> "500", 33.33 -> "33.33"). */
export function moneyToInput(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Soma dos pagamentos com valor válido. */
export function sumPayments(rows: PaymentRow[]): number {
  return rows.reduce((sum, r) => sum + (parseMoneyInput(r.value) ?? 0), 0);
}

/** Pagamentos que valem: só as linhas com valor maior que zero. */
export function filledPayments(rows: PaymentRow[]): PaymentRow[] {
  return rows.filter((r) => parseMoneyInput(r.value) !== null);
}

/** Aviso para quem ainda não pode avançar: pagamento com valor mas sem data não aparece no Financeiro. */
export function paymentsError(rows: PaymentRow[]): string | null {
  const filled = filledPayments(rows);
  if (filled.length === 0) return null;
  const withoutDate = filled.findIndex((r) => !r.due);
  if (withoutDate >= 0) {
    return filled.length === 1
      ? "Informe a data prevista de pagamento — sem ela o valor não aparece no Financeiro."
      : `Informe a data prevista do pagamento ${withoutDate + 1} — sem ela o valor não aparece no Financeiro.`;
  }
  return null;
}
