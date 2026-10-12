import "server-only";
import { timingSafeEqual } from "node:crypto";
import { utcToLocalDate } from "@/domain/availability";
import {
  GatewayNotConfiguredError,
  WebhookAuthError,
  type Charge,
  type ChargeStatus,
  type CreateChargeInput,
  type PaymentGateway,
  type TransferStatus,
  type WebhookEvent,
} from "./gateway";

/**
 * Adaptador Asaas (API v3). Baseado na documentação oficial (docs.asaas.com):
 * - Autenticação: header `access_token`.
 * - Cliente (`POST /customers`) exige `name` e `cpfCnpj`.
 * - Cobrança (`POST /payments`) com billingType PIX ou CREDIT_CARD; o cartão é
 *   digitado na página do próprio Asaas (`invoiceUrl`) — a plataforma não vê dados de cartão.
 * - QR PIX: `GET /payments/{id}/pixQrCode` → `payload` (copia e cola) e `encodedImage`.
 * - Estorno: `POST /payments/{id}/refund` (parcial permitido no PIX); concluído só com status DONE.
 * - Repasse: `POST /transfers` para a chave PIX do profissional (pode exigir autorização por SMS).
 * - Webhook: header `asaas-access-token`; entrega "pelo menos uma vez" → idempotência no serviço.
 *
 * Modelo: cobrança na conta da plataforma SEM split; repasse por transferência
 * após a conclusão (o split nativo não aceita data futura).
 */
const BASE: Record<string, string> = {
  sandbox: "https://api-sandbox.asaas.com/v3",
  production: "https://api.asaas.com/v3",
};

type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  netValue?: number;
  invoiceUrl?: string;
  billingType?: string;
  refunds?: { status: string; value: number }[] | null;
};

const toCents = (reais: number) => Math.round(reais * 100);
const toReais = (cents: number) => Number((cents / 100).toFixed(2));

const STATUS: Record<string, ChargeStatus> = {
  PENDING: "PENDING",
  AWAITING_RISK_ANALYSIS: "PENDING",
  CONFIRMED: "APPROVED",
  RECEIVED: "APPROVED",
  RECEIVED_IN_CASH: "APPROVED",
  OVERDUE: "EXPIRED",
  REFUNDED: "REFUNDED",
  // Estorno solicitado/em andamento: o pagamento ainda conta como aprovado até o DONE.
  REFUND_REQUESTED: "APPROVED",
  REFUND_IN_PROGRESS: "APPROVED",
  CHARGEBACK_REQUESTED: "APPROVED",
  CHARGEBACK_DISPUTE: "APPROVED",
  AWAITING_CHARGEBACK_REVERSAL: "APPROVED",
  DUNNING_REQUESTED: "EXPIRED",
  DUNNING_RECEIVED: "APPROVED",
};

export class AsaasError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export class AsaasGateway implements PaymentGateway {
  readonly name = "asaas";
  readonly isSimulated = false;
  readonly requiresPayerDocument = true;

  private config() {
    const apiKey = process.env.ASAAS_API_KEY;
    const env = process.env.ASAAS_ENV ?? "sandbox";
    if (!apiKey) throw new GatewayNotConfiguredError("ASAAS_API_KEY não configurada.");
    if (!BASE[env]) throw new GatewayNotConfiguredError("ASAAS_ENV deve ser 'sandbox' ou 'production'.");
    return { apiKey, base: BASE[env]! };
  }

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const { apiKey, base } = this.config();
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        access_token: apiKey,
        "content-type": "application/json",
        "user-agent": "LarPronto-Marketplace/1.0",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : null;
    if (!res.ok) {
      const errors = (data as { errors?: { description?: string }[] } | null)?.errors;
      const msg = errors?.map((e) => e.description).filter(Boolean).join("; ") || `HTTP ${res.status}`;
      // Nunca registra a chave nem dados do pagador; só o erro do provedor.
      console.error(`[asaas] ${method} ${path.split("?")[0]} → ${res.status}: ${msg}`);
      throw new AsaasError(`Provedor de pagamento recusou a operação: ${msg}`, res.status);
    }
    return data as T;
  }

  /** Reaproveita o cliente do Asaas; cria se ainda não existir. */
  private async ensureCustomer(c: CreateChargeInput["customer"]): Promise<string> {
    if (c.gatewayCustomerId) return c.gatewayCustomerId;
    if (!c.cpfCnpj) throw new AsaasError("Informe o CPF ou CNPJ de quem vai pagar.", 400);
    const found = await this.call<{ data: { id: string }[] }>("GET", `/customers?cpfCnpj=${c.cpfCnpj}&limit=1`);
    if (found.data?.[0]?.id) return found.data[0].id;
    const created = await this.call<{ id: string }>("POST", "/customers", {
      name: c.name,
      cpfCnpj: c.cpfCnpj,
      email: c.email,
      externalReference: c.id,
      // Avisos ao cliente são enviados pela plataforma.
      notificationDisabled: true,
    });
    return created.id;
  }

  private async toCharge(p: AsaasPayment): Promise<Charge> {
    const refundedCents = (p.refunds ?? []).filter((r) => r.status === "DONE").reduce((a, r) => a + toCents(r.value), 0);
    const amountCents = toCents(p.value);
    let status = STATUS[p.status] ?? "PENDING";
    if (status === "APPROVED" && refundedCents > 0) status = refundedCents >= amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED";
    return {
      id: p.id,
      status,
      rawStatus: p.status,
      amountCents,
      refundedCents,
      feeCents: p.netValue !== undefined ? Math.max(0, amountCents - toCents(p.netValue)) : null,
      expiresAt: null,
      checkoutUrl: p.invoiceUrl,
    };
  }

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    const customerId = await this.ensureCustomer(input.customer);
    const payment = await this.call<AsaasPayment>("POST", "/payments", {
      customer: customerId,
      billingType: input.method === "PIX" ? "PIX" : "CREDIT_CARD",
      value: toReais(input.amountCents),
      dueDate: utcToLocalDate(new Date()),
      description: input.description.slice(0, 500),
      externalReference: input.idempotencyKey,
    });
    const charge = await this.toCharge(payment);
    charge.gatewayCustomerId = customerId;
    charge.expiresAt = input.expiresAt;
    if (input.method === "PIX") {
      const qr = await this.call<{ encodedImage: string; payload: string }>("GET", `/payments/${payment.id}/pixQrCode`);
      charge.pix = { copyPaste: qr.payload, qrImageBase64: qr.encodedImage };
    }
    return charge;
  }

  async getCharge(chargeId: string): Promise<Charge> {
    return this.toCharge(await this.call<AsaasPayment>("GET", `/payments/${encodeURIComponent(chargeId)}`));
  }

  async refund(chargeId: string, amountCents: number) {
    const payment = await this.call<AsaasPayment>("POST", `/payments/${encodeURIComponent(chargeId)}/refund`, {
      value: toReais(amountCents),
      description: "Cancelamento de pedido",
    });
    const last = (payment.refunds ?? []).at(-1);
    return { refundId: `${payment.id}:${(payment.refunds ?? []).length}`, status: last?.status === "DONE" ? ("SUCCEEDED" as const) : ("PROCESSING" as const) };
  }

  /** destinationRef = "PIX:<TIPO>:<chave>" (cadastrada pelo profissional). */
  async transfer(input: { destinationRef: string | null; amountCents: number; idempotencyKey: string; description: string }) {
    const m = /^PIX:(CPF|CNPJ|EMAIL|PHONE|EVP):(.+)$/.exec(input.destinationRef ?? "");
    if (!m) throw new AsaasError("Profissional sem chave PIX válida cadastrada.", 400);
    const t = await this.call<{ id: string; status: string; authorized?: boolean }>("POST", "/transfers", {
      value: toReais(input.amountCents),
      pixAddressKey: m[2],
      pixAddressKeyType: m[1],
      description: input.description.slice(0, 140),
      externalReference: input.idempotencyKey,
    });
    return { transferId: t.id, status: t.status === "DONE" ? ("DONE" as const) : ("PENDING" as const) };
  }

  async getTransfer(transferId: string): Promise<TransferStatus> {
    const t = await this.call<{ status: string; failReason?: string | null }>("GET", `/transfers/${encodeURIComponent(transferId)}`);
    const status = t.status === "DONE" ? "DONE" : t.status === "FAILED" ? "FAILED" : t.status === "CANCELLED" ? "CANCELLED" : "PENDING";
    return { status, failReason: t.failReason ?? null };
  }

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookEvent> {
    const expected = process.env.ASAAS_WEBHOOK_TOKEN;
    if (!expected) throw new GatewayNotConfiguredError("ASAAS_WEBHOOK_TOKEN não configurado.");
    const a = Buffer.from(headers.get("asaas-access-token") ?? "");
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new WebhookAuthError("Token do webhook inválido.");
    const body = JSON.parse(rawBody) as { id?: string; event?: string; payment?: { id?: string }; transfer?: { id?: string } };
    if (!body.id || !body.event) throw new WebhookAuthError("Evento malformado.");
    return { eventId: body.id, type: body.event, chargeId: body.payment?.id, transferId: body.transfer?.id };
  }
}
