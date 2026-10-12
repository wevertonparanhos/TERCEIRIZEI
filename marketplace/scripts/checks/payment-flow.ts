/**
 * Verificação ponta a ponta de PAGAMENTOS (provedor SIMULADO) contra o banco
 * real, com o código de produção. Usa só contas FICTÍCIAS (is_demo).
 * Executar: npm run check:payments
 */
import { addDays, utcToLocalDate } from "@/domain/availability";
import { acceptBooking, createBooking, transitionBooking } from "@/server/booking";
import { db } from "@/server/db";
import { activeGateway } from "@/server/payments";
import { creditBalance, handleWebhook, releasePayout, requestRefund, startPayment } from "@/server/payments/service";
import { setSimulatedChargeOutcome, signSimulatedWebhook } from "@/server/payments/simulated";
import { getProviderSlots } from "@/server/scheduling";

let failures = 0;
const log = (ok: boolean, msg: string) => {
  if (!ok) failures++;
  console.log(`${ok ? "✔" : "✘"} ${msg}`);
};
const asSession = (u: { id: string; email: string; name: string; phone: string | null; role: "CUSTOMER" | "PROVIDER" | "SUPPORT" | "ADMIN"; status: "ACTIVE" | "SUSPENDED" }) => ({
  id: u.id, email: u.email, name: u.name, phone: u.phone, role: u.role, status: u.status,
});

async function pay(customer: Parameters<typeof startPayment>[0], bookingId: string, method: "PIX" | "CARD") {
  const r = await startPayment(customer, bookingId, method);
  if (r.paidWithCredit) throw new Error("inesperado: pago com crédito");
  return r.payment;
}

async function sendWebhook(chargeId: string, type: string, eventId?: string) {
  const { body, headers } = signSimulatedWebhook({ type, chargeId, id: eventId });
  return handleWebhook("simulated", headers, body);
}

async function main() {
  if (!activeGateway().isSimulated) throw new Error("Abortado: só roda com PAYMENT_MODE=simulated.");
  const customerU = await db.user.findUniqueOrThrow({ where: { email: "demo.cliente2@exemplo.invalid" } });
  const adminU = await db.user.findUniqueOrThrow({ where: { email: "demo.admin@exemplo.invalid" } });
  if (!customerU.isDemo || !adminU.isDemo) throw new Error("Abortado: contas de teste precisam ser de demonstração.");
  const customer = asSession(customerU);
  const admin = asSession(adminU);
  const ana = await db.providerProfile.findFirstOrThrow({ where: { user: { email: "demo.ana@exemplo.invalid" } } });
  const service = await db.service.findUniqueOrThrow({ where: { slug: "limpeza-basica" }, include: { packages: true } });
  const pkg = service.packages.find((p) => p.slug === "ate-2-quartos")!;
  const address = await db.address.findFirstOrThrow({ where: { userId: customer.id } });

  async function newConfirmableBooking(daysAhead: number) {
    let date = addDays(utcToLocalDate(new Date()), daysAhead);
    let slots = await getProviderSlots(ana.id, date, 240);
    for (let i = 0; slots.length === 0 && i < 10; i++) {
      date = addDays(date, 1);
      slots = await getProviderSlots(ana.id, date, 240);
    }
    const b = await createBooking(customer, {
      serviceId: service.id, providerId: ana.id, packageId: pkg.id, addons: {}, addressId: address.id,
      date, start: slots[0]!.start.toISOString(), hasPets: false, notes: "TESTE AUTOMATIZADO PAGAMENTO", acceptTerms: true,
    });
    await acceptBooking(ana.id, ana.userId, b.id);
    return b;
  }

  // ── 1. Pagamento recusado e depois aprovado ──
  const b1 = await newConfirmableBooking(3);
  const p1 = await pay(customer, b1.id, "PIX");
  log(p1.status === "PENDING" && p1.isSimulated && !!p1.pixCopyPaste?.startsWith("SIMULACAO"), `cobrança PIX SIMULADA criada (${p1.providerPaymentId})`);
  const again = await pay(customer, b1.id, "PIX");
  log(again.id === p1.id, "abrir o pagamento de novo reaproveita a mesma cobrança (sem duplicar)");

  const forged = await handleWebhook("simulated", new Headers({ "x-sim-signature": "t=1,v1=00" }), JSON.stringify({ id: "x", type: "PAYMENT_RECEIVED", chargeId: p1.providerPaymentId }));
  log(forged.status === 401, "webhook com assinatura falsa rejeitado (401)");
  const stale = signSimulatedWebhook({ type: "PAYMENT_RECEIVED", chargeId: p1.providerPaymentId! }, Date.now() - 3_600_000);
  log((await handleWebhook("simulated", stale.headers, stale.body)).status === 401, "webhook com assinatura antiga (replay) rejeitado");

  // Webhook "aprovado" mentiroso: provedor ainda diz PENDENTE → nada muda (reconsulta é a fonte da verdade)
  await sendWebhook(p1.providerPaymentId!, "PAYMENT_RECEIVED");
  const stillPending = await db.booking.findUniqueOrThrow({ where: { id: b1.id } });
  log(stillPending.status === "AWAITING_PAYMENT" && !stillPending.contactReleasedAt, "evento dizendo 'pago' sem o provedor confirmar NÃO libera o pedido nem o contato");

  await setSimulatedChargeOutcome(p1.providerPaymentId!, "DECLINED");
  await sendWebhook(p1.providerPaymentId!, "PAYMENT_DECLINED");
  const declined = await db.paymentTransaction.findUniqueOrThrow({ where: { id: p1.id } });
  const afterDecline = await db.booking.findUniqueOrThrow({ where: { id: b1.id } });
  log(declined.status === "DECLINED" && afterDecline.status === "AWAITING_PAYMENT" && !afterDecline.contactReleasedAt, "pagamento recusado: pedido segue aguardando pagamento, contato bloqueado");

  const p2 = await pay(customer, b1.id, "CARD");
  await setSimulatedChargeOutcome(p2.providerPaymentId!, "RECEIVED");
  const evt = `sim_evt_dup_${p2.id}`;
  const first = await sendWebhook(p2.providerPaymentId!, "PAYMENT_RECEIVED", evt);
  const dup = await sendWebhook(p2.providerPaymentId!, "PAYMENT_RECEIVED", evt);
  log(first.status === 200 && dup.body === "evento já processado", "webhook duplicado é ignorado (idempotência)");

  const confirmed = await db.booking.findUniqueOrThrow({ where: { id: b1.id }, include: { commission: true, payout: true } });
  log(confirmed.status === "CONFIRMED" && !!confirmed.contactReleasedAt, "pagamento aprovado: pedido CONFIRMADO e contato liberado");
  log(confirmed.commission?.amountCents === confirmed.commissionCents, `comissão registrada uma vez: R$ ${(confirmed.commission?.amountCents ?? 0) / 100}`);
  log(confirmed.payout?.status === "ON_HOLD" && confirmed.payout.netCents === confirmed.providerShareCents, `repasse criado RETIDO: R$ ${(confirmed.payout?.netCents ?? 0) / 100}`);

  // Conciliação extra (simula webhook atrasado) não duplica nada
  await sendWebhook(p2.providerPaymentId!, "PAYMENT_CONFIRMED");
  log((await db.platformCommission.count({ where: { bookingId: b1.id } })) === 1, "evento extra não duplica comissão");

  // ── 2. Repasse bloqueado antes da conclusão ──
  try {
    await releasePayout(admin, confirmed.payout!.id);
    log(false, "repasse pago antes da conclusão (falha)");
  } catch (e) {
    log(true, `repasse antes da conclusão recusado ("${(e as Error).message}")`);
  }
  try {
    await db.providerPayout.update({ where: { id: confirmed.payout!.id }, data: { status: "PAID" } });
    log(false, "banco aceitou marcar repasse como pago antes da conclusão (falha)");
  } catch {
    log(true, "banco bloqueia marcar repasse como pago antes da conclusão");
  }

  // ── 3. Execução: finalizar exige foto/vídeo ──
  await transitionBooking({ bookingId: b1.id, to: "IN_PROGRESS", actor: { id: ana.userId, type: "PROVIDER" }, reason: "Teste" });
  try {
    await transitionBooking({ bookingId: b1.id, to: "COMPLETION_PENDING", actor: { id: ana.userId, type: "PROVIDER" }, reason: "Teste sem foto" });
    log(false, "finalizou sem foto/vídeo (falha)");
  } catch {
    log(true, "banco impede finalizar sem foto/vídeo");
  }
  await db.bookingEvidence.create({ data: { bookingId: b1.id, uploadedBy: ana.userId, storagePath: `${b1.id}/teste-automatizado.jpg`, mediaType: "IMAGE", mimeType: "image/jpeg", sizeBytes: 1024 } });
  await transitionBooking({ bookingId: b1.id, to: "COMPLETION_PENDING", actor: { id: ana.userId, type: "PROVIDER" }, reason: "Teste com foto", data: { providerFinishedAt: new Date() } });
  await transitionBooking({ bookingId: b1.id, to: "COMPLETED", actor: { id: customer.id, type: "CUSTOMER" }, reason: "Cliente confirmou (teste)" });
  const scheduled = await db.providerPayout.findUniqueOrThrow({ where: { bookingId: b1.id } });
  log(scheduled.status === "SCHEDULED", "cliente confirmou → repasse liberado (AGENDADO) automaticamente");
  await releasePayout(admin, scheduled.id);
  const paid = await db.providerPayout.findUniqueOrThrow({ where: { bookingId: b1.id } });
  log(paid.status === "PAID" && !!paid.providerTransferId?.startsWith("sim_tr_"), "repasse pago (transferência SIMULADA)");
  try {
    await releasePayout(admin, scheduled.id);
    log(false, "repasse pago duas vezes (falha)");
  } catch {
    log(true, "repasse não pode ser pago duas vezes");
  }

  // ── 4. Cancelamento com reembolso ──
  const b2 = await newConfirmableBooking(4);
  const p3 = await pay(customer, b2.id, "PIX");
  await setSimulatedChargeOutcome(p3.providerPaymentId!, "RECEIVED");
  await sendWebhook(p3.providerPaymentId!, "PAYMENT_RECEIVED");
  const rule = await requestRefund({ bookingId: b2.id, actor: { id: customer.id, type: "CUSTOMER" }, reason: "Teste automatizado de cancelamento", where: { customerId: customer.id } });
  const refunded = await db.booking.findUniqueOrThrow({ where: { id: b2.id }, include: { commission: true, payout: true, refunds: true } });
  log(refunded.status === "REFUNDED" && refunded.refundedCents === refunded.totalCents, `cliente cancelou → REEMBOLSADO R$ ${refunded.refundedCents / 100} (${rule})`);
  log(!!refunded.commission?.reversedAt && refunded.payout?.status === "CANCELLED" && refunded.refunds[0]?.status === "SUCCEEDED", "comissão estornada, repasse cancelado, reembolso concluído");

  // ── 4b. Menos de 24h (fora do arrependimento do CDC): crédito OU estorno sem a taxa ──
  async function paidBookingInLessThan24h(daysAhead: number) {
    const b = await newConfirmableBooking(daysAhead);
    const p = await pay(customer, b.id, "PIX");
    await setSimulatedChargeOutcome(p.providerPaymentId!, "RECEIVED");
    await sendWebhook(p.providerPaymentId!, "PAYMENT_RECEIVED");
    // Simula: pago há 10 dias e o serviço começa em 5h (sem mexer em valores).
    const start = new Date(Date.now() + 5 * 3_600_000);
    await db.paymentTransaction.update({ where: { id: p.id }, data: { approvedAt: new Date(Date.now() - 10 * 86_400_000) } });
    await db.booking.update({ where: { id: b.id }, data: { scheduledStart: start, scheduledEnd: new Date(start.getTime() + 4 * 3_600_000), blockedUntil: new Date(start.getTime() + 4.5 * 3_600_000) } });
    return db.booking.findUniqueOrThrow({ where: { id: b.id } });
  }
  const before = await creditBalance(customer.id);
  const bc = await paidBookingInLessThan24h(6);
  try {
    await requestRefund({ bookingId: bc.id, actor: { id: customer.id, type: "CUSTOMER" }, reason: "Teste", where: { customerId: customer.id }, choice: "REFUND_FULL" });
    log(false, "reembolso integral aceito com menos de 24h (falha)");
  } catch (e) {
    log(true, `com menos de 24h, reembolso integral não é opção ("${(e as Error).message}")`);
  }
  await requestRefund({ bookingId: bc.id, actor: { id: customer.id, type: "CUSTOMER" }, reason: "Teste crédito", where: { customerId: customer.id }, choice: "CREDIT" });
  const afterCredit = await creditBalance(customer.id);
  const bcAfter = await db.booking.findUniqueOrThrow({ where: { id: bc.id }, include: { commission: true, payout: true } });
  log(afterCredit - before === bc.totalCents && bcAfter.status === "REFUNDED" && bcAfter.refundedCents === 0, `opção CRÉDITO: ${(bc.totalCents / 100).toFixed(2)} viraram crédito, nada estornado ao cartão/PIX`);
  log(!!bcAfter.commission?.reversedAt && bcAfter.payout?.status === "CANCELLED", "opção crédito: comissão estornada (valor integral vira crédito) e repasse cancelado");

  const bf = await paidBookingInLessThan24h(7);
  await requestRefund({ bookingId: bf.id, actor: { id: customer.id, type: "CUSTOMER" }, reason: "Teste estorno", where: { customerId: customer.id }, choice: "REFUND_MINUS_FEE" });
  const bfAfter = await db.booking.findUniqueOrThrow({ where: { id: bf.id }, include: { commission: true, payout: true } });
  log(bfAfter.status === "REFUNDED" && bfAfter.refundedCents === bf.totalCents - bf.commissionCents && !bfAfter.commission?.reversedAt,
    `opção ESTORNO: devolvidos ${(bfAfter.refundedCents / 100).toFixed(2)}, taxa de serviço ${(bf.commissionCents / 100).toFixed(2)} retida`);

  // ── 4c. Pagar com crédito ──
  const bk = await newConfirmableBooking(8);
  const balanceBefore = await creditBalance(customer.id);
  const r = await startPayment(customer, bk.id, "PIX", true);
  const bkAfter = await db.booking.findUniqueOrThrow({ where: { id: bk.id } });
  if (balanceBefore >= bk.totalCents) {
    log(r.paidWithCredit && bkAfter.status === "CONFIRMED" && bkAfter.creditAppliedCents === bk.totalCents && !!bkAfter.contactReleasedAt, "pago 100% com crédito: confirmado na hora, sem cobrança no provedor");
  } else {
    log(!r.paidWithCredit && bkAfter.creditAppliedCents === balanceBefore && r.payment.amountCents === bk.totalCents - balanceBefore, "crédito parcial: só o restante é cobrado no provedor");
  }
  try {
    await db.customerCredit.create({ data: { userId: customer.id, amountCents: -(await creditBalance(customer.id)) - 1, kind: "PAYMENT", description: "Teste de saldo negativo" } });
    log(false, "banco aceitou saldo de crédito negativo (falha)");
  } catch {
    log(true, "banco impede gastar mais crédito do que o saldo");
  }

  // ── 5. Pagamento que chega depois de a reserva expirar → estorno automático ──
  const b3 = await newConfirmableBooking(5);
  const p4 = await pay(customer, b3.id, "PIX");
  await db.booking.update({ where: { id: b3.id }, data: { holdExpiresAt: new Date(Date.now() - 60_000) } });
  await db.$queryRaw`select public.expire_stale_holds()`;
  await setSimulatedChargeOutcome(p4.providerPaymentId!, "RECEIVED");
  await sendWebhook(p4.providerPaymentId!, "PAYMENT_RECEIVED");
  const late = await db.booking.findUniqueOrThrow({ where: { id: b3.id }, include: { refunds: true, payments: true } });
  const lateRefunded = late.payments.find((p) => p.id === p4.id);
  log(late.status === "EXPIRED" && lateRefunded?.status === "REFUNDED" && late.refunds[0]?.status === "SUCCEEDED", "pagamento após expiração foi estornado automaticamente e o pedido não reativou");

  console.log(failures === 0 ? "\nTUDO CERTO" : `\n${failures} FALHA(S)`);
  if (failures) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error("ERRO", e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
