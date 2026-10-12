import "server-only";

/**
 * Contrato de um provedor de pagamentos. A aplicação só conversa com esta
 * interface — trocar de provedor (Asaas, Mercado Pago, …) = novo adaptador.
 *
 * Regras de uso:
 * - Webhook só é aceito com autenticidade verificada (`verifyWebhook`).
 * - O status oficial SEMPRE é reconsultado com `getCharge` (nunca confiar no corpo do webhook).
 * - Toda operação que move dinheiro recebe uma chave de idempotência.
 */
export type PaymentMethod = "PIX" | "CARD";
export type ChargeStatus = "PENDING" | "APPROVED" | "DECLINED" | "EXPIRED" | "REFUNDED" | "PARTIALLY_REFUNDED";

export type Charge = {
  id: string;
  status: ChargeStatus;
  rawStatus: string;
  amountCents: number;
  refundedCents: number;
  /** Taxa cobrada pelo provedor, quando informada. */
  feeCents: number | null;
  expiresAt: Date | null;
  pix?: { copyPaste: string; qrImageBase64?: string };
  checkoutUrl?: string;
  /** Id do cliente criado no provedor (para reaproveitar nas próximas cobranças). */
  gatewayCustomerId?: string;
};

export type CreateChargeInput = {
  externalReference: string;
  amountCents: number;
  method: PaymentMethod;
  description: string;
  idempotencyKey: string;
  customer: { id: string; name: string; email: string; cpfCnpj: string | null; gatewayCustomerId: string | null };
  expiresAt: Date;
};

/** Evento autenticado: de cobrança (`chargeId`) ou de transferência (`transferId`). */
export type WebhookEvent = { eventId: string; type: string; chargeId?: string; transferId?: string };

export type TransferStatus = { status: "DONE" | "PENDING" | "FAILED" | "CANCELLED"; failReason?: string | null };

export interface PaymentGateway {
  readonly name: string;
  /** true = SIMULAÇÃO (desenvolvimento). Nunca movimenta dinheiro real. */
  readonly isSimulated: boolean;
  createCharge(input: CreateChargeInput): Promise<Charge>;
  getCharge(chargeId: string): Promise<Charge>;
  refund(chargeId: string, amountCents: number, idempotencyKey: string): Promise<{ refundId: string; status: "SUCCEEDED" | "PROCESSING" }>;
  transfer(input: { destinationRef: string | null; amountCents: number; idempotencyKey: string; description: string }): Promise<{ transferId: string; status: "DONE" | "PENDING" }>;
  getTransfer(transferId: string): Promise<TransferStatus>;
  /** true quando a cobrança exige CPF/CNPJ do pagador. */
  readonly requiresPayerDocument: boolean;
  /** Lança WebhookAuthError se a requisição não vier comprovadamente do provedor. */
  verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookEvent>;
}

export class WebhookAuthError extends Error {}
export class GatewayNotConfiguredError extends Error {}
