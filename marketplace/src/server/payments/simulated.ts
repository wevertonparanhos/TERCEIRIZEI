import "server-only";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "../db";
import { WebhookAuthError, type Charge, type ChargeStatus, type CreateChargeInput, type PaymentGateway, type WebhookEvent } from "./gateway";

/**
 * Provedor de pagamentos de SIMULAÇÃO — apenas desenvolvimento.
 * Não movimenta dinheiro. Segue o mesmo protocolo de um provedor real:
 * cobrança com id próprio, webhook assinado (HMAC-SHA256 com carimbo de
 * tempo) e reconsulta do status.
 */
const SIGNATURE_HEADER = "x-sim-signature";
const TOLERANCE_SECONDS = 300;

function webhookSecret(): string {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("PAYMENT_WEBHOOK_SECRET obrigatório em produção.");
  return "dev-only-simulated-webhook-secret";
}

const STATUS_MAP: Record<string, ChargeStatus> = {
  PENDING: "PENDING",
  RECEIVED: "APPROVED",
  DECLINED: "DECLINED",
  EXPIRED: "EXPIRED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
};

function toCharge(row: { id: string; status: string; amountCents: number; refundedCents: number; expiresAt: Date; method: string }): Charge {
  return {
    id: row.id,
    status: STATUS_MAP[row.status] ?? "PENDING",
    rawStatus: row.status,
    amountCents: row.amountCents,
    refundedCents: row.refundedCents,
    feeCents: 0,
    expiresAt: row.expiresAt,
    pix: row.method === "PIX" ? { copyPaste: `SIMULACAO-PIX-NAO-PAGAVEL-${row.id}` } : undefined,
  };
}

export class SimulatedGateway implements PaymentGateway {
  readonly name = "simulated";
  readonly isSimulated = true;

  async createCharge(input: CreateChargeInput): Promise<Charge> {
    // Id determinístico pela chave de idempotência: repetir a chamada devolve a mesma cobrança.
    const id = `sim_ch_${createHash("sha256").update(input.idempotencyKey).digest("hex").slice(0, 24)}`;
    const row = await db.simGatewayCharge.upsert({
      where: { id },
      create: { id, externalReference: input.externalReference, method: input.method, amountCents: input.amountCents, expiresAt: input.expiresAt },
      update: {},
    });
    return toCharge(row);
  }

  async getCharge(chargeId: string): Promise<Charge> {
    const row = await db.simGatewayCharge.findUniqueOrThrow({ where: { id: chargeId } });
    if (row.status === "PENDING" && row.expiresAt < new Date()) {
      return toCharge(await db.simGatewayCharge.update({ where: { id: chargeId }, data: { status: "EXPIRED" } }));
    }
    return toCharge(row);
  }

  async refund(chargeId: string, amountCents: number) {
    const row = await db.simGatewayCharge.findUniqueOrThrow({ where: { id: chargeId } });
    if (row.status !== "RECEIVED" && row.status !== "PARTIALLY_REFUNDED") throw new Error("Cobrança não está paga.");
    const refunded = Math.min(row.amountCents, row.refundedCents + amountCents);
    await db.simGatewayCharge.update({
      where: { id: chargeId },
      data: { refundedCents: refunded, status: refunded >= row.amountCents ? "REFUNDED" : "PARTIALLY_REFUNDED" },
    });
    return { refundId: `sim_rf_${randomUUID()}`, status: "SUCCEEDED" as const };
  }

  async transfer() {
    return { transferId: `sim_tr_${randomUUID()}`, status: "DONE" as const };
  }

  async verifyWebhook(headers: Headers, rawBody: string): Promise<WebhookEvent> {
    const header = headers.get(SIGNATURE_HEADER) ?? "";
    const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
    const t = Number(parts.t);
    if (!parts.v1 || !Number.isFinite(t)) throw new WebhookAuthError("Assinatura ausente.");
    if (Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDS) throw new WebhookAuthError("Assinatura expirada.");
    const expected = createHmac("sha256", webhookSecret()).update(`${t}.${rawBody}`).digest();
    const given = Buffer.from(parts.v1, "hex");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new WebhookAuthError("Assinatura inválida.");

    const body = JSON.parse(rawBody) as { id?: unknown; type?: unknown; chargeId?: unknown };
    if (typeof body.id !== "string" || typeof body.type !== "string" || typeof body.chargeId !== "string") {
      throw new WebhookAuthError("Evento malformado.");
    }
    return { eventId: body.id, type: body.type, chargeId: body.chargeId };
  }
}

/** Monta um webhook assinado como o "provedor simulado" enviaria. */
export function signSimulatedWebhook(event: { type: string; chargeId: string; id?: string }, at = Date.now()) {
  const body = JSON.stringify({ id: event.id ?? `sim_evt_${randomUUID()}`, type: event.type, chargeId: event.chargeId });
  const t = Math.floor(at / 1000);
  const v1 = createHmac("sha256", webhookSecret()).update(`${t}.${body}`).digest("hex");
  return { body, headers: new Headers({ "content-type": "application/json", [SIGNATURE_HEADER]: `t=${t},v1=${v1}` }) };
}

/** Painel de simulação: muda o estado no "provedor" (como se o cliente pagasse/recusasse). */
export async function setSimulatedChargeOutcome(chargeId: string, outcome: "RECEIVED" | "DECLINED") {
  const row = await db.simGatewayCharge.findUniqueOrThrow({ where: { id: chargeId } });
  if (row.status !== "PENDING") throw new Error("Esta cobrança simulada já foi finalizada.");
  await db.simGatewayCharge.update({ where: { id: chargeId }, data: { status: outcome } });
}
