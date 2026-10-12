/**
 * Máquina de estados do pedido. Toda mudança de status passa por
 * `assertTransition` no servidor, que valida a transição E quem a executa.
 *
 * Ajuste em relação ao briefing: CONFIRMED já significa "pago e agendado"
 * (o horário é escolhido antes do pagamento), por isso não há SCHEDULED
 * separado. EXPIRED cobre reservas/pagamentos que venceram sem confirmação.
 */
export const BOOKING_STATUSES = [
  "DRAFT",
  "AWAITING_PAYMENT",
  "PAYMENT_PROCESSING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "REFUND_PENDING",
  "REFUNDED",
  "DISPUTED",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Quem dispara a transição. SYSTEM = webhook/rotina confiável do servidor. */
export type Actor = "CUSTOMER" | "PROVIDER" | "ADMIN" | "SUPPORT" | "SYSTEM";

type Rule = { to: BookingStatus; by: Actor[] };

const TRANSITIONS: Record<BookingStatus, Rule[]> = {
  DRAFT: [
    { to: "AWAITING_PAYMENT", by: ["CUSTOMER"] },
    { to: "CANCELLED", by: ["CUSTOMER", "SYSTEM"] },
  ],
  AWAITING_PAYMENT: [
    { to: "PAYMENT_PROCESSING", by: ["SYSTEM"] },
    // Só o servidor, a partir de confirmação do provedor de pagamento.
    { to: "CONFIRMED", by: ["SYSTEM"] },
    { to: "EXPIRED", by: ["SYSTEM"] },
    { to: "CANCELLED", by: ["CUSTOMER", "ADMIN", "SYSTEM"] },
  ],
  PAYMENT_PROCESSING: [
    { to: "CONFIRMED", by: ["SYSTEM"] },
    // Recusado: volta para nova tentativa enquanto a reserva não expira.
    { to: "AWAITING_PAYMENT", by: ["SYSTEM"] },
    { to: "EXPIRED", by: ["SYSTEM"] },
  ],
  CONFIRMED: [
    { to: "IN_PROGRESS", by: ["PROVIDER", "ADMIN"] },
    { to: "REFUND_PENDING", by: ["CUSTOMER", "PROVIDER", "ADMIN", "SUPPORT", "SYSTEM"] },
    // Cancelamento sem reembolso devido (ex.: fora do prazo da política).
    { to: "CANCELLED", by: ["ADMIN", "SYSTEM"] },
    { to: "DISPUTED", by: ["CUSTOMER", "PROVIDER", "ADMIN", "SUPPORT", "SYSTEM"] },
  ],
  IN_PROGRESS: [
    { to: "COMPLETION_PENDING", by: ["PROVIDER", "ADMIN"] },
    { to: "DISPUTED", by: ["CUSTOMER", "PROVIDER", "ADMIN", "SUPPORT"] },
  ],
  COMPLETION_PENDING: [
    // Cliente confirma, ou o sistema confirma após o prazo sem contestação.
    { to: "COMPLETED", by: ["CUSTOMER", "ADMIN", "SYSTEM"] },
    { to: "DISPUTED", by: ["CUSTOMER", "ADMIN", "SUPPORT"] },
  ],
  COMPLETED: [
    // Contestação/chargeback após a conclusão.
    { to: "DISPUTED", by: ["ADMIN", "SUPPORT", "SYSTEM"] },
  ],
  DISPUTED: [
    { to: "COMPLETED", by: ["ADMIN"] },
    { to: "REFUND_PENDING", by: ["ADMIN", "SYSTEM"] },
    { to: "CANCELLED", by: ["ADMIN"] },
  ],
  REFUND_PENDING: [
    { to: "REFUNDED", by: ["SYSTEM", "ADMIN"] },
    // Reembolso falhou/negado: volta para análise.
    { to: "DISPUTED", by: ["ADMIN", "SYSTEM"] },
  ],
  CANCELLED: [],
  EXPIRED: [],
  REFUNDED: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus,
    public readonly actor: Actor,
  ) {
    super(`Transição não permitida: ${from} → ${to} por ${actor}.`);
  }
}

export function allowedTransitions(from: BookingStatus, actor: Actor): BookingStatus[] {
  return TRANSITIONS[from].filter((r) => r.by.includes(actor)).map((r) => r.to);
}

export function canTransition(from: BookingStatus, to: BookingStatus, actor: Actor): boolean {
  return TRANSITIONS[from].some((r) => r.to === to && r.by.includes(actor));
}

export function assertTransition(from: BookingStatus, to: BookingStatus, actor: Actor): void {
  if (!canTransition(from, to, actor)) throw new InvalidTransitionError(from, to, actor);
}

export function isTerminal(status: BookingStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/** Estados em que o horário do prestador está ocupado (espelha a constraint do banco). */
export const SLOT_HOLDING_STATUSES: readonly BookingStatus[] = [
  "AWAITING_PAYMENT",
  "PAYMENT_PROCESSING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
];

/** Estados em que os contatos já foram liberados por pagamento confirmado. */
const CONTACT_VISIBLE: readonly BookingStatus[] = [
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETION_PENDING",
  "COMPLETED",
  "DISPUTED",
];

/**
 * Regra de liberação de contato: exige estado pós-pagamento E o carimbo
 * `contactReleasedAt`, gravado somente pela confirmação confiável do provedor.
 */
export function canSeeCounterpartyContact(status: BookingStatus, contactReleasedAt: Date | null): boolean {
  return contactReleasedAt !== null && CONTACT_VISIBLE.includes(status);
}

export const STATUS_LABEL: Record<BookingStatus, string> = {
  DRAFT: "Rascunho",
  AWAITING_PAYMENT: "Aguardando pagamento",
  PAYMENT_PROCESSING: "Processando pagamento",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETION_PENDING: "Aguardando confirmação de conclusão",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
  REFUND_PENDING: "Reembolso em processamento",
  REFUNDED: "Reembolsado",
  DISPUTED: "Em análise",
};
