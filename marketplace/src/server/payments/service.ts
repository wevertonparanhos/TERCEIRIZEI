import "server-only";
import { Prisma } from "@prisma/client";
import { canReleasePayout } from "@/domain/completion";
import { formatBRL } from "@/domain/money";
import { normalizeCpfCnpj } from "@/domain/documents";
import { cancellationOptions, type CancelledBy, type CancellationOption } from "@/domain/refund";
import { audit } from "../audit";
import type { SessionUser } from "../auth";
import { BookingError, transitionBookingTx } from "../booking";
import { db } from "../db";
import { notify } from "../notifications";
import { expireStaleHolds } from "../scheduling";
import { getSettings } from "../settings";
import { activeGateway, gatewayByName, WebhookAuthError, type PaymentGateway, type PaymentMethod } from ".";

export class PaymentError extends Error {}

// ── Créditos ────────────────────────────────────────────────────────────────

export async function creditBalance(userId: string, tx: Prisma.TransactionClient = db) {
  const r = await tx.customerCredit.aggregate({ where: { userId }, _sum: { amountCents: true } });
  return r._sum.amountCents ?? 0;
}

// ── Cobrança ────────────────────────────────────────────────────────────────

type BookingWithProvider = Prisma.BookingGetPayload<{ include: { provider: { select: { userId: true } } } }>;

async function lockBooking(tx: Prisma.TransactionClient, bookingId: string): Promise<BookingWithProvider> {
  await tx.$queryRaw`select id from public.bookings where id = ${bookingId}::uuid for update`;
  return tx.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { provider: { select: { userId: true } } } });
}

/**
 * Inicia o pagamento de um pedido ACEITO. Com `useCredit`, usa o saldo de
 * crédito primeiro: se cobrir tudo, o pedido é confirmado na hora; se não,
 * o restante é cobrado no provedor.
 */
export async function startPayment(user: SessionUser, bookingId: string, method: PaymentMethod, useCredit = false, payerDocument?: string | null) {
  await expireStaleHolds();
  const gateway = activeGateway();

  // 1) Crédito (uma única vez por pedido; o banco impede saldo negativo).
  if (useCredit) {
    const fullyPaid = await db.$transaction(async (tx) => {
      const b = await lockBooking(tx, bookingId);
      if (b.customerId !== user.id) throw new PaymentError("Pedido não encontrado.");
      if (b.status !== "AWAITING_PAYMENT") throw new PaymentError("Este pedido não está aguardando pagamento.");
      if (b.creditAppliedCents > 0) return b.creditAppliedCents >= b.totalCents;
      const balance = await creditBalance(user.id, tx);
      const use = Math.min(balance, b.totalCents);
      if (use <= 0) throw new PaymentError("Você não tem saldo de crédito.");
      await tx.customerCredit.create({ data: { userId: user.id, bookingId: b.id, amountCents: -use, kind: "PAYMENT", description: `Usado no pedido ${b.code}` } });
      await tx.booking.update({ where: { id: b.id }, data: { creditAppliedCents: use } });
      if (use >= b.totalCents) {
        await confirmBookingTx(tx, b, { feeCents: 0, isSimulated: gateway.isSimulated, reason: "Pago integralmente com crédito da plataforma" });
        return true;
      }
      return false;
    });
    if (fullyPaid) return { paidWithCredit: true as const };
  }

  // 2) Restante no provedor.
  const booking = await db.booking.findFirst({
    where: { id: bookingId, customerId: user.id },
    include: { payments: { orderBy: { createdAt: "desc" } }, service: { select: { name: true } } },
  });
  if (!booking) throw new PaymentError("Pedido não encontrado.");
  if (booking.status !== "AWAITING_PAYMENT" || !booking.holdExpiresAt || booking.holdExpiresAt < new Date()) {
    throw new PaymentError("Este pedido não está aguardando pagamento.");
  }
  const amount = booking.totalCents - booking.creditAppliedCents;

  const pending = booking.payments.find((p) => p.status === "PENDING");
  if (pending && pending.method === method && pending.provider === gateway.name && pending.amountCents === amount) {
    const charge = await gateway.getCharge(pending.providerPaymentId!);
    if (charge.status === "PENDING") return { paidWithCredit: false as const, payment: pending };
  }
  if (pending) {
    await db.paymentTransaction.update({ where: { id: pending.id }, data: { status: "CANCELLED", failureReason: "Substituída por nova tentativa" } });
  }

  // Pagador: CPF/CNPJ (exigido por provedores reais) e cliente já criado no provedor.
  const profile = await db.customerProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  let cpfCnpj = profile.cpfCnpj;
  if (payerDocument) {
    const normalized = normalizeCpfCnpj(payerDocument);
    if (!normalized) throw new PaymentError("CPF ou CNPJ inválido.");
    if (normalized !== cpfCnpj) {
      await db.customerProfile.update({ where: { userId: user.id }, data: { cpfCnpj: normalized, asaasCustomerId: null } });
      cpfCnpj = normalized;
    }
  }
  if (gateway.requiresPayerDocument && !cpfCnpj) throw new PaymentError("Informe seu CPF ou CNPJ para pagar.");

  const attempt = booking.payments.length + 1;
  const idempotencyKey = `${booking.id}:${method}:${attempt}`;
  const charge = await gateway.createCharge({
    externalReference: booking.id,
    amountCents: amount,
    method,
    description: `${booking.service.name} — pedido ${booking.code}`,
    idempotencyKey,
    customer: {
      id: user.id,
      name: user.name,
      email: user.email,
      cpfCnpj,
      gatewayCustomerId: gateway.name === "asaas" && cpfCnpj === profile.cpfCnpj ? profile.asaasCustomerId : null,
    },
    expiresAt: booking.holdExpiresAt,
  });
  if (gateway.name === "asaas" && charge.gatewayCustomerId && charge.gatewayCustomerId !== profile.asaasCustomerId) {
    await db.customerProfile.update({ where: { userId: user.id }, data: { asaasCustomerId: charge.gatewayCustomerId } });
  }

  const payment = await db.paymentTransaction.create({
    data: {
      bookingId: booking.id,
      provider: gateway.name,
      providerPaymentId: charge.id,
      idempotencyKey,
      method,
      status: "PENDING",
      amountCents: amount,
      isSimulated: gateway.isSimulated,
      pixCopyPaste: charge.pix?.copyPaste ?? null,
      pixQrCode: charge.pix?.qrImageBase64 ?? null,
      checkoutUrl: charge.checkoutUrl ?? null,
      providerStatus: charge.rawStatus,
      expiresAt: charge.expiresAt,
    },
  });
  return { paidWithCredit: false as const, payment };
}

/** Cliente cancela pedido NÃO pago: libera o horário e devolve o crédito usado, se houver. */
export async function cancelUnpaidBooking(user: SessionUser, bookingId: string) {
  await db.$transaction(async (tx) => {
    const b = await lockBooking(tx, bookingId);
    if (b.customerId !== user.id || !["AWAITING_PROVIDER", "AWAITING_PAYMENT"].includes(b.status)) throw new BookingError("Este pedido não pode mais ser cancelado por aqui.");
    await transitionBookingTx(tx, { bookingId, to: "CANCELLED", actor: { id: user.id, type: "CUSTOMER" }, reason: "Cancelado pelo cliente antes do pagamento" });
    if (b.creditAppliedCents > 0) {
      await tx.customerCredit.create({ data: { userId: user.id, bookingId, amountCents: b.creditAppliedCents, kind: "PAYMENT_REVERSAL", description: `Crédito devolvido: pedido ${b.code} cancelado antes do pagamento` } });
    }
    await tx.paymentTransaction.updateMany({ where: { bookingId, status: "PENDING" }, data: { status: "CANCELLED", failureReason: "Pedido cancelado" } });
  });
}

// ── Webhook ─────────────────────────────────────────────────────────────────

export type WebhookResult = { status: 200 | 401 | 404 | 500; body: string };

/** Autentica, registra o evento UMA vez (provider+eventId) e sincroniza reconsultando o provedor. */
export async function handleWebhook(providerName: string, headers: Headers, rawBody: string): Promise<WebhookResult> {
  const gateway = gatewayByName(providerName);
  if (!gateway) return { status: 404, body: "provedor desconhecido" };

  let event;
  try {
    event = await gateway.verifyWebhook(headers, rawBody);
  } catch (error) {
    if (error instanceof WebhookAuthError) {
      console.warn("[webhook] rejeitado:", error.message);
      return { status: 401, body: "assinatura inválida" };
    }
    throw error;
  }

  let record;
  try {
    record = await db.paymentWebhookEvent.create({
      data: { provider: gateway.name, eventId: event.eventId, type: event.type, payload: JSON.parse(rawBody) as Prisma.InputJsonValue, signatureValid: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { status: 200, body: "evento já processado" };
    throw error;
  }

  try {
    if (event.transferId) await syncTransfer(gateway, event.transferId);
    else if (event.chargeId) await syncCharge(gateway, event.chargeId);
    await db.paymentWebhookEvent.update({ where: { id: record.id }, data: { processedAt: new Date() } });
    return { status: 200, body: "ok" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.paymentWebhookEvent.update({ where: { id: record.id }, data: { error: message.slice(0, 500) } });
    console.error("[webhook] falha ao processar", event.eventId, message);
    return { status: 500, body: "falha ao processar" };
  }
}

/** Aplica o status OFICIAL do provedor. Idempotente (webhook repetido/conciliação). */
export async function syncCharge(gateway: PaymentGateway, chargeId: string) {
  const payment = await db.paymentTransaction.findUnique({
    where: { provider_providerPaymentId: { provider: gateway.name, providerPaymentId: chargeId } },
  });
  if (!payment) throw new PaymentError(`Cobrança desconhecida: ${chargeId}`);
  const charge = await gateway.getCharge(chargeId);

  if (charge.status === "APPROVED") return confirmPayment(payment.id, charge.feeCents ?? 0, charge.rawStatus);
  if (charge.status === "DECLINED" || charge.status === "EXPIRED") {
    await db.paymentTransaction.updateMany({
      where: { id: payment.id, status: "PENDING" },
      data: { status: charge.status, providerStatus: charge.rawStatus, failureReason: charge.status === "DECLINED" ? "Pagamento recusado" : "Cobrança expirada" },
    });
    return;
  }
  if (charge.status === "REFUNDED" || charge.status === "PARTIALLY_REFUNDED") return settleRefund(payment.id, charge.refundedCents, charge.status, charge.rawStatus);
}

/** Confirma o pedido: contatos liberados, comissão registrada, repasse RETIDO até a conclusão. */
async function confirmBookingTx(tx: Prisma.TransactionClient, booking: BookingWithProvider, p: { feeCents: number; isSimulated: boolean; reason: string }) {
  const now = new Date();
  await transitionBookingTx(tx, {
    bookingId: booking.id,
    to: "CONFIRMED",
    actor: { id: null, type: "SYSTEM" },
    reason: p.reason,
    data: { confirmedAt: now, contactReleasedAt: now, holdExpiresAt: null, paymentFeeCents: p.feeCents },
  });
  const providerFee = booking.feeBearer === "PROVIDER" ? Math.min(p.feeCents, booking.providerShareCents) : 0;
  await tx.platformCommission.upsert({
    where: { bookingId: booking.id },
    create: { bookingId: booking.id, rateBps: booking.commissionRateBps, amountCents: booking.commissionCents },
    update: {},
  });
  await tx.providerPayout.upsert({
    where: { bookingId: booking.id },
    create: {
      bookingId: booking.id,
      providerId: booking.providerId!,
      grossCents: booking.providerShareCents,
      commissionCents: booking.commissionMode === "INCLUDED" ? booking.commissionCents : 0,
      feeCents: providerFee,
      netCents: booking.providerShareCents - providerFee,
      status: "ON_HOLD",
      isSimulated: p.isSimulated,
      note: "Retido até a conclusão (foto/vídeo e/ou confirmação do cliente)",
    },
    update: {},
  });
  await notify(tx, booking.customerId, "PAYMENT_CONFIRMED", "Pagamento confirmado", `Pedido ${booking.code} confirmado. O contato do profissional já está liberado.`, `/conta/pedidos/${booking.id}`);
  if (booking.provider) {
    await notify(tx, booking.provider.userId, "BOOKING_CONFIRMED", "Serviço confirmado", `O cliente pagou o pedido ${booking.code}. Endereço e telefone liberados.`, "/profissional/pedidos");
  }
}

async function confirmPayment(paymentId: string, feeCents: number, rawStatus: string) {
  let lateRefund: { chargeId: string; provider: string; amount: number; key: string } | null = null;

  await db.$transaction(async (tx) => {
    const payment = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.status === "APPROVED" || payment.status === "REFUNDED" || payment.status === "PARTIALLY_REFUNDED") return;
    const booking = await lockBooking(tx, payment.bookingId);
    await tx.paymentTransaction.update({ where: { id: payment.id }, data: { status: "APPROVED", approvedAt: new Date(), feeCents, providerStatus: rawStatus } });

    if (booking.status !== "AWAITING_PAYMENT" && booking.status !== "PAYMENT_PROCESSING") {
      // Chegou depois de o pedido expirar/cancelar: estorno integral automático.
      const key = `${payment.id}:late-refund`;
      await tx.refund.create({
        data: { bookingId: booking.id, paymentId: payment.id, amountCents: payment.amountCents, reason: "Pagamento recebido após o pedido expirar/cancelar", status: "PROCESSING", idempotencyKey: key },
      });
      lateRefund = { chargeId: payment.providerPaymentId!, provider: payment.provider, amount: payment.amountCents, key };
      await notify(tx, booking.customerId, "PAYMENT_LATE_REFUND", "Pagamento estornado", `O pedido ${booking.code} já não estava ativo; o valor será devolvido integralmente.`, `/conta/pedidos/${booking.id}`);
      return;
    }
    await confirmBookingTx(tx, booking, { feeCents, isSimulated: payment.isSimulated, reason: payment.isSimulated ? "Pagamento SIMULADO confirmado" : "Pagamento confirmado pelo provedor" });
  });

  const r = lateRefund as { chargeId: string; provider: string; amount: number; key: string } | null;
  if (r) {
    const gateway = gatewayByName(r.provider)!;
    await gateway.refund(r.chargeId, r.amount, r.key);
    await syncCharge(gateway, r.chargeId);
  }
}

// ── Cancelamento de pedido pago ─────────────────────────────────────────────

/** Opções de cancelamento disponíveis agora (para exibir ao cliente/profissional). */
export async function cancellationPreview(bookingId: string, cancelledBy: CancelledBy) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payments: { where: { status: { in: ["APPROVED", "PARTIALLY_REFUNDED"] } }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!booking) return null;
  const settings = await getSettings();
  const payment = booking.payments[0];
  return cancellationOptions({
    paidCents: payment?.amountCents ?? 0,
    creditAppliedCents: booking.creditAppliedCents,
    alreadyRefundedCents: booking.refundedCents,
    commissionCents: booking.commissionCents,
    scheduledStart: booking.scheduledStart,
    paidAt: payment?.approvedAt ?? booking.confirmedAt ?? booking.createdAt,
    now: new Date(),
    cancelledBy,
    fullRefundMinHours: settings.fullRefundMinHours,
    withdrawalDays: settings.cdcWithdrawalDays,
  });
}

/**
 * Cancela pedido PAGO aplicando a regra das 24h. O cliente escolhe a opção
 * (`choice`) quando há mais de uma; profissional/plataforma → integral.
 * Admin pode, em mediação, definir o valor a estornar ao meio de pagamento.
 */
export async function requestRefund(params: {
  bookingId: string;
  actor: { id: string; type: "CUSTOMER" | "PROVIDER" | "ADMIN" };
  reason: string;
  where?: Prisma.BookingWhereInput;
  choice?: CancellationOption["kind"];
  amountOverrideCents?: number;
}) {
  const settings = await getSettings();
  let job: { chargeId: string; provider: string; amount: number; key: string } | null = null;
  let summary = "";

  await db.$transaction(async (tx) => {
    const found = await tx.booking.findFirst({ where: { id: params.bookingId, ...params.where }, select: { id: true } });
    if (!found) throw new BookingError("Pedido não encontrado.");
    const booking = await lockBooking(tx, found.id);
    const allowed = params.actor.type === "ADMIN" ? ["CONFIRMED", "DISPUTED", "IN_PROGRESS", "COMPLETION_PENDING"] : ["CONFIRMED"];
    if (!allowed.includes(booking.status)) throw new BookingError("Este pedido não pode ser cancelado com reembolso por aqui.");

    const payment = await tx.paymentTransaction.findFirst({ where: { bookingId: booking.id, status: { in: ["APPROVED", "PARTIALLY_REFUNDED"] } } });
    if (!payment && booking.creditAppliedCents === 0) throw new BookingError("Pagamento não encontrado para este pedido.");

    let option: CancellationOption;
    if (params.actor.type === "ADMIN" && params.amountOverrideCents !== undefined) {
      const paidLeft = (payment?.amountCents ?? 0) - booking.refundedCents;
      const toPayment = Math.min(params.amountOverrideCents, paidLeft);
      option = { kind: "REFUND_FULL", label: "Reembolso definido em mediação", refundToPaymentCents: toPayment, creditCents: 0, retainedFeeCents: 0 };
      summary = `Reembolso definido pela administração: ${formatBRL(toPayment)}.`;
    } else {
      const cancelledBy: CancelledBy = params.actor.type === "CUSTOMER" ? "CUSTOMER" : params.actor.type === "PROVIDER" ? "PROVIDER" : "PLATFORM";
      const decision = cancellationOptions({
        paidCents: payment?.amountCents ?? 0,
        creditAppliedCents: booking.creditAppliedCents,
        alreadyRefundedCents: booking.refundedCents,
        commissionCents: booking.commissionCents,
        scheduledStart: booking.scheduledStart,
        paidAt: payment?.approvedAt ?? booking.confirmedAt ?? booking.createdAt,
        now: new Date(),
        cancelledBy,
        fullRefundMinHours: settings.fullRefundMinHours,
        withdrawalDays: settings.cdcWithdrawalDays,
      });
      if (!decision.ok) throw new BookingError(decision.reason);
      const chosen = decision.options.find((o) => o.kind === (params.choice ?? decision.options[0]!.kind));
      if (!chosen) throw new BookingError("Escolha uma das opções de cancelamento disponíveis.");
      option = chosen;
      summary = `${decision.rule} Opção: ${option.label}.`;
    }

    const toPayment = option.refundToPaymentCents;
    await transitionBookingTx(tx, {
      bookingId: booking.id,
      to: "REFUND_PENDING",
      actor: params.actor,
      reason: `${params.reason} — ${summary}`,
      data: { cancelledAt: new Date(), cancelReason: params.reason.slice(0, 300) },
    });

    // Serviço não será feito: repasse cancelado. Taxa retida? Comissão fica; senão, estornada.
    await tx.providerPayout.updateMany({ where: { bookingId: booking.id, status: { in: ["ON_HOLD", "SCHEDULED"] } }, data: { status: "CANCELLED", note: "Pedido cancelado" } });
    if (option.retainedFeeCents === 0) {
      await tx.platformCommission.updateMany({ where: { bookingId: booking.id, reversedAt: null }, data: { reversedAt: new Date() } });
    }

    if (option.creditCents > 0) {
      await tx.customerCredit.create({
        data: {
          userId: booking.customerId,
          bookingId: booking.id,
          amountCents: option.creditCents,
          kind: option.kind === "CREDIT" ? "CANCELLATION_CREDIT" : "REFUND_TO_CREDIT",
          description: option.kind === "CREDIT" ? `Crédito do cancelamento do pedido ${booking.code}` : `Devolução em crédito do pedido ${booking.code}`,
          createdBy: params.actor.id,
        },
      });
    }

    if (toPayment > 0 && payment) {
      const key = `${booking.id}:refund:${(await tx.refund.count({ where: { bookingId: booking.id } })) + 1}`;
      await tx.refund.create({
        data: { bookingId: booking.id, paymentId: payment.id, amountCents: toPayment, reason: params.reason.slice(0, 500), status: "PROCESSING", idempotencyKey: key, requestedBy: params.actor.id },
      });
      job = { chargeId: payment.providerPaymentId!, provider: payment.provider, amount: toPayment, key };
    } else {
      // Nada a estornar no meio de pagamento (tudo virou crédito): encerra já.
      await transitionBookingTx(tx, { bookingId: booking.id, to: "REFUNDED", actor: { id: null, type: "SYSTEM" }, reason: option.creditCents > 0 ? "Valor convertido em crédito na plataforma" : "Cancelado" });
    }

    if (params.actor.type === "ADMIN") {
      await audit({ actorId: params.actor.id, action: "booking.refund", entityType: "booking", entityId: booking.id, description: `Cancelamento/reembolso do pedido ${booking.code}: ${summary}`, metadata: { reason: params.reason, option } }, tx);
    }
    const msg = [
      toPayment > 0 ? `estorno de ${formatBRL(toPayment)} em processamento` : null,
      option.creditCents > 0 ? `${formatBRL(option.creditCents)} em crédito na plataforma` : null,
      option.retainedFeeCents > 0 ? `taxa de serviço de ${formatBRL(option.retainedFeeCents)} retida` : null,
    ].filter(Boolean).join("; ");
    await notify(tx, booking.customerId, "BOOKING_CANCELLED", "Pedido cancelado", `Pedido ${booking.code} cancelado: ${msg}.`, `/conta/pedidos/${booking.id}`);
    if (booking.provider) await notify(tx, booking.provider.userId, "BOOKING_CANCELLED", "Pedido cancelado", `O pedido ${booking.code} foi cancelado.`, "/profissional/pedidos");
  });

  const j = job as { chargeId: string; provider: string; amount: number; key: string } | null;
  if (j) {
    const gateway = gatewayByName(j.provider)!;
    const result = await gateway.refund(j.chargeId, j.amount, j.key);
    await db.refund.update({ where: { idempotencyKey: j.key }, data: { providerRefundId: result.refundId } });
    await syncCharge(gateway, j.chargeId);
  }
  return summary;
}

async function settleRefund(paymentId: string, refundedCents: number, status: "REFUNDED" | "PARTIALLY_REFUNDED", rawStatus: string) {
  await db.$transaction(async (tx) => {
    const payment = await tx.paymentTransaction.findUniqueOrThrow({ where: { id: paymentId } });
    const booking = await lockBooking(tx, payment.bookingId);
    await tx.paymentTransaction.update({ where: { id: payment.id }, data: { status, providerStatus: rawStatus } });
    await tx.refund.updateMany({ where: { paymentId: payment.id, status: { in: ["REQUESTED", "PROCESSING"] } }, data: { status: "SUCCEEDED", processedAt: new Date() } });
    if (booking.refundedCents !== refundedCents) {
      await tx.booking.update({ where: { id: booking.id }, data: { refundedCents: Math.min(refundedCents, booking.totalCents) } });
    }
    if (booking.status === "REFUND_PENDING") {
      await transitionBookingTx(tx, { bookingId: booking.id, to: "REFUNDED", actor: { id: null, type: "SYSTEM" }, reason: "Estorno confirmado pelo provedor" });
      await notify(tx, booking.customerId, "REFUND_DONE", "Estorno concluído", `O estorno do pedido ${booking.code} foi processado.`, `/conta/pedidos/${booking.id}`);
    }
  });
}

// ── Repasse ─────────────────────────────────────────────────────────────────

/** Paga um repasse AGENDADO (só existe para pedido concluído — regra também no banco). */
export async function releasePayout(admin: SessionUser, payoutId: string) {
  const payout = await db.providerPayout.findUnique({
    where: { id: payoutId },
    include: {
      booking: { select: { status: true, code: true } },
      provider: { select: { displayName: true, payoutAccountRef: true, payoutPixKeyType: true, payoutPixKey: true, userId: true } },
    },
  });
  if (!payout) throw new PaymentError("Repasse não encontrado.");
  if (payout.status !== "SCHEDULED") throw new PaymentError("Este repasse não está liberado para pagamento.");
  if (payout.kind === "SERVICE") {
    const rule = canReleasePayout(payout.booking.status);
    if (!rule.ok) throw new PaymentError(rule.reason);
  }
  const gateway = activeGateway();
  const destination = payout.provider.payoutPixKeyType && payout.provider.payoutPixKey
    ? `PIX:${payout.provider.payoutPixKeyType}:${payout.provider.payoutPixKey}`
    : payout.provider.payoutAccountRef;
  if (!gateway.isSimulated && !destination) throw new PaymentError("Profissional sem chave PIX cadastrada para receber.");

  const claimed = await db.providerPayout.updateMany({ where: { id: payout.id, status: "SCHEDULED", note: { not: "Transferência em andamento" } }, data: { note: "Transferência em andamento" } });
  if (claimed.count === 0) throw new PaymentError("Repasse já em processamento.");

  let result: { transferId: string; status: "DONE" | "PENDING" };
  try {
    result = await gateway.transfer({ destinationRef: destination, amountCents: payout.netCents, idempotencyKey: `payout:${payout.id}`, description: `Repasse pedido ${payout.booking.code}` });
  } catch (error) {
    // Libera a trava para nova tentativa; o erro do provedor é exibido ao admin.
    await db.providerPayout.update({ where: { id: payout.id }, data: { note: "Falha na última tentativa de transferência" } });
    throw error;
  }
  await db.$transaction(async (tx) => {
    await tx.providerPayout.update({
      where: { id: payout.id },
      data: {
        status: result.status === "DONE" ? "PAID" : "SCHEDULED",
        paidAt: result.status === "DONE" ? new Date() : null,
        providerTransferId: result.transferId,
        note: gateway.isSimulated ? "Transferência SIMULADA" : result.status === "DONE" ? null : "Transferência em processamento no provedor (pode exigir autorização no painel do Asaas)",
      },
    });
    await audit({ actorId: admin.id, action: "payout.release", entityType: "provider_payout", entityId: payout.id, description: `Repasse de ${formatBRL(payout.netCents)} para ${payout.provider.displayName} (pedido ${payout.booking.code})${gateway.isSimulated ? " — SIMULADO" : ""}` }, tx);
    await notify(tx, payout.provider.userId, "PAYOUT_PAID", "Repasse enviado", `Repasse do pedido ${payout.booking.code} enviado${gateway.isSimulated ? " (simulação)" : ""}.`, "/profissional/financeiro");
  });
}

/** Aplica o status oficial de uma transferência (repasse) do provedor. */
export async function syncTransfer(gateway: PaymentGateway, transferId: string) {
  const payout = await db.providerPayout.findFirst({ where: { providerTransferId: transferId }, include: { booking: { select: { code: true } }, provider: { select: { userId: true } } } });
  if (!payout || payout.status === "PAID") return;
  const t = await gateway.getTransfer(transferId);
  if (t.status === "DONE") {
    await db.$transaction(async (tx) => {
      const done = await tx.providerPayout.updateMany({ where: { id: payout.id, status: { not: "PAID" } }, data: { status: "PAID", paidAt: new Date(), note: null } });
      if (done.count) await notify(tx, payout.provider.userId, "PAYOUT_PAID", "Repasse enviado", `Repasse do pedido ${payout.booking.code} concluído.`, "/profissional/financeiro");
    });
  } else if (t.status === "FAILED" || t.status === "CANCELLED") {
    await db.providerPayout.update({ where: { id: payout.id }, data: { status: "SCHEDULED", providerTransferId: null, note: `Transferência ${t.status === "FAILED" ? "falhou" : "cancelada"}${t.failReason ? `: ${t.failReason}` : ""}. Verifique a chave PIX e tente de novo.` } });
  }
}

/** Reconsulta as cobranças pendentes de um pedido (útil sem webhook, ex.: ambiente local). */
export async function syncBookingPayments(bookingId: string) {
  const pending = await db.paymentTransaction.findMany({ where: { bookingId, status: "PENDING" } });
  for (const p of pending) {
    const gateway = gatewayByName(p.provider);
    if (!gateway || gateway.isSimulated || !p.providerPaymentId) continue;
    try {
      await syncCharge(gateway, p.providerPaymentId);
    } catch (error) {
      console.error("[sync] falha ao consultar cobrança", p.id, error instanceof Error ? error.message : error);
    }
  }
}

/** Conciliação: reconsulta cobranças pendentes e transferências em andamento no provedor. */
export async function reconcilePendingPayments() {
  const pending = await db.paymentTransaction.findMany({ where: { status: "PENDING" }, take: 100 });
  let updated = 0;
  for (const p of pending) {
    const gateway = gatewayByName(p.provider);
    if (!gateway || !p.providerPaymentId) continue;
    await syncCharge(gateway, p.providerPaymentId);
    const after = await db.paymentTransaction.findUnique({ where: { id: p.id }, select: { status: true } });
    if (after?.status !== "PENDING") updated++;
  }
  const transfers = await db.providerPayout.findMany({ where: { status: "SCHEDULED", providerTransferId: { not: null } }, take: 100 });
  for (const t of transfers) {
    const gateway = activeGateway();
    await syncTransfer(gateway, t.providerTransferId!);
  }
  return { checked: pending.length + transfers.length, updated };
}
