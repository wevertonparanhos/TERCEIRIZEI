import type { Cents } from "./money";

/**
 * Cancelamento de pedido PAGO — regra do negócio (2026-10-12):
 *
 * - Cliente cancela com pelo menos 24h de antecedência → reembolso integral.
 * - Cliente cancela com menos de 24h → ele ESCOLHE:
 *     (a) CRÉDITO na plataforma do valor integral; ou
 *     (b) ESTORNO do valor pago MENOS a taxa de serviço (taxa fica retida).
 * - Profissional (ou plataforma) cancela → reembolso integral sempre.
 * - Direito de arrependimento do CDC (até N dias da contratação e antes do
 *   serviço) → reembolso integral (garantia legal, não afastável por contrato).
 * - Depois do início do serviço o cliente não cancela sozinho (mediação).
 *
 * "Valor do pedido" = parte paga no provedor + parte paga com crédito.
 */
export type CancelledBy = "CUSTOMER" | "PROVIDER" | "PLATFORM";

export type CancellationInput = {
  /** Pago via provedor (PIX/cartão). */
  paidCents: Cents;
  /** Pago com crédito da plataforma. */
  creditAppliedCents: Cents;
  alreadyRefundedCents: Cents;
  /** Taxa de serviço (comissão) do pedido. */
  commissionCents: Cents;
  scheduledStart: Date;
  paidAt: Date;
  now: Date;
  cancelledBy: CancelledBy;
  fullRefundMinHours: number;
  withdrawalDays: number;
};

/** Como o dinheiro volta: parte ao meio de pagamento, parte como crédito. */
export type Settlement = { refundToPaymentCents: Cents; creditCents: Cents; retainedFeeCents: Cents };

export type CancellationOption =
  | ({ kind: "REFUND_FULL"; label: string } & Settlement)
  | ({ kind: "CREDIT"; label: string } & Settlement)
  | ({ kind: "REFUND_MINUS_FEE"; label: string } & Settlement);

export type CancellationDecision = { ok: true; rule: string; options: CancellationOption[] } | { ok: false; reason: string };

export function cancellationOptions(i: CancellationInput): CancellationDecision {
  const paidLeft = Math.max(0, i.paidCents - i.alreadyRefundedCents);
  const total = paidLeft + i.creditAppliedCents;
  if (total <= 0) return { ok: false, reason: "Este pedido já foi totalmente reembolsado." };

  const fullRefund: CancellationOption = {
    kind: "REFUND_FULL",
    label: "Reembolso integral",
    refundToPaymentCents: paidLeft,
    creditCents: i.creditAppliedCents, // o que foi pago com crédito volta como crédito
    retainedFeeCents: 0,
  };

  if (i.cancelledBy !== "CUSTOMER") {
    return { ok: true, rule: i.cancelledBy === "PROVIDER" ? "Cancelado pelo profissional: reembolso integral." : "Cancelado pela plataforma: reembolso integral.", options: [fullRefund] };
  }
  if (i.now >= i.scheduledStart) return { ok: false, reason: "O serviço já começou. Relate um problema para análise da equipe." };

  if (i.now.getTime() <= i.paidAt.getTime() + i.withdrawalDays * 86_400_000) {
    return { ok: true, rule: `Direito de arrependimento (até ${i.withdrawalDays} dias da contratação): reembolso integral.`, options: [fullRefund] };
  }

  const hoursBefore = (i.scheduledStart.getTime() - i.now.getTime()) / 3_600_000;
  if (hoursBefore >= i.fullRefundMinHours) {
    return { ok: true, rule: `Cancelamento com ${i.fullRefundMinHours}h ou mais de antecedência: reembolso integral.`, options: [fullRefund] };
  }

  // Menos de 24h: crédito integral OU estorno sem a taxa de serviço.
  const fee = Math.min(i.commissionCents, total);
  const feeFromPayment = Math.min(fee, paidLeft);
  const feeFromCredit = fee - feeFromPayment;
  return {
    ok: true,
    rule: `Cancelamento com menos de ${i.fullRefundMinHours}h de antecedência: escolha entre crédito integral na plataforma ou estorno com a taxa de serviço retida.`,
    options: [
      { kind: "CREDIT", label: "Crédito integral na plataforma", refundToPaymentCents: 0, creditCents: total, retainedFeeCents: 0 },
      {
        kind: "REFUND_MINUS_FEE",
        label: "Estorno sem a taxa de serviço",
        refundToPaymentCents: paidLeft - feeFromPayment,
        creditCents: i.creditAppliedCents - feeFromCredit,
        retainedFeeCents: fee,
      },
    ],
  };
}
