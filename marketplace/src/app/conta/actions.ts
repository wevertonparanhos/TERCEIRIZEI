"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/form";
import { InvalidTransitionError } from "@/domain/booking-state";
import { can } from "@/domain/permissions";
import { canReview, reviewInputSchema } from "@/domain/reviews";
import { echoValues } from "@/lib/form-state";
import { addressSchema, fieldErrors, profileSchema } from "@/lib/validation";
import { getSessionUser } from "@/server/auth";
import { BookingError } from "@/server/booking";
import { confirmCompletion, reportProblem } from "@/server/completion";
import { activeGateway } from "@/server/payments";
import { cancelUnpaidBooking, handleWebhook, PaymentError, requestRefund, startPayment } from "@/server/payments/service";
import { setSimulatedChargeOutcome, signSimulatedWebhook } from "@/server/payments/simulated";
import { db } from "@/server/db";

/** Atualiza nome/telefone do PRÓPRIO usuário (o id vem da sessão, nunca do formulário). */
export async function updateOwnProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { message: "Sua sessão expirou. Entre novamente." };

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos destacados." };

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone || null },
  });
  revalidatePath("/conta");
  return { ok: true, message: "Dados atualizados." };
}

/**
 * Cliente avalia o profissional de um pedido CONCLUÍDO. O pedido é buscado
 * pelo id E pelo cliente da sessão; quem avalia e quem é avaliado vêm do
 * pedido, nunca do formulário. O banco repete a checagem (gatilho).
 */
export async function createReviewAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user || !can(user.role, "review:create:own")) return { message: "Faça login como cliente para avaliar." };

  const bookingId = z.uuid().safeParse(formData.get("bookingId"));
  if (!bookingId.success) return { message: "Pedido inválido." };

  const parsed = reviewInputSchema.safeParse({
    ...Object.fromEntries(formData),
    tags: formData.getAll("tags").map(String),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise a avaliação.", values: echoValues(formData) };

  const booking = await db.booking.findFirst({
    where: { id: bookingId.data, customerId: user.id },
    select: { id: true, status: true, customerId: true, providerId: true, completedAt: true, review: { select: { id: true } } },
  });
  if (!booking) return { message: "Pedido não encontrado." };

  const eligibility = canReview({ booking, userId: user.id, alreadyReviewed: !!booking.review });
  if (!eligibility.ok) return { message: eligibility.reason };

  try {
    await db.review.create({
      data: { bookingId: booking.id, customerId: user.id, providerId: booking.providerId!, ...parsed.data },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { message: "Este pedido já foi avaliado." };
    console.error("[review]", error);
    return { message: "Não foi possível enviar a avaliação. Tente novamente." };
  }

  revalidatePath("/conta");
  revalidatePath(`/profissionais/${booking.providerId}`);
  redirect("/conta?avaliado=1");
}

// ── Endereços ──────────────────────────────────────────────────────────────

export async function saveAddressAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user || !can(user.role, "address:manage:own")) return { message: "Faça login como cliente." };
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise o endereço.", values: echoValues(formData) };
  const { id, ...data } = parsed.data;

  const count = await db.address.count({ where: { userId: user.id } });
  if (!id && count >= 10) return { message: "Limite de 10 endereços. Remova um antes de adicionar outro." };
  const makeDefault = data.isDefault || count === 0;

  await db.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
    if (id) {
      const updated = await tx.address.updateMany({ where: { id, userId: user.id }, data: { ...data, isDefault: makeDefault } });
      if (updated.count === 0) throw new Error("Endereço não encontrado.");
    } else {
      await tx.address.create({ data: { ...data, isDefault: makeDefault, userId: user.id } });
    }
  });
  revalidatePath("/conta/enderecos");
  return { ok: true, message: "Endereço salvo." };
}

export async function deleteAddressAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { message: "Faça login." };
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { message: "Endereço inválido." };

  const used = await db.booking.count({ where: { addressId: id.data, customerId: user.id } });
  if (used > 0) return { message: "Este endereço está em pedidos e não pode ser removido (mantemos o histórico)." };
  await db.address.deleteMany({ where: { id: id.data, userId: user.id } });
  revalidatePath("/conta/enderecos");
  return { ok: true, message: "Endereço removido." };
}

// ── Pedidos ────────────────────────────────────────────────────────────────

/** Cliente cancela solicitação/pedido ainda não pago (libera o horário na hora). */
export async function cancelUnpaidBookingAction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user || !can(user.role, "booking:read:own")) return { message: "Faça login." };
  const id = z.uuid().safeParse(formData.get("bookingId"));
  if (!id.success) return { message: "Pedido inválido." };
  try {
    await cancelUnpaidBooking(user, id.data);
  } catch (error) {
    if (error instanceof BookingError || error instanceof PaymentError) return { message: error.message };
    if (error instanceof InvalidTransitionError) return { message: "Este pedido não pode mais ser cancelado por aqui. Fale com o suporte." };
    console.error("[cancel]", error);
    return { message: "Não foi possível cancelar agora." };
  }
  revalidatePath(`/conta/pedidos/${id.data}`);
  revalidatePath("/conta");
  return { ok: true, message: "Pedido cancelado e horário liberado." };
}

// ── Pagamento, cancelamento com reembolso e conclusão ──────────────────────

async function customerOrFail() {
  const user = await getSessionUser();
  if (!user || !can(user.role, "booking:read:own")) throw new BookingError("Entre com sua conta de cliente.");
  return user;
}

function actionError(error: unknown): FormState {
  if (error instanceof BookingError || error instanceof PaymentError || error instanceof InvalidTransitionError) return { message: error.message };
  console.error("[conta]", error);
  return { message: "Não foi possível concluir agora. Tente novamente." };
}

export async function startPaymentAction(_: FormState, formData: FormData): Promise<FormState> {
  let paidWithCredit: string | null = null;
  try {
    const user = await customerOrFail();
    const bookingId = z.uuid().parse(formData.get("bookingId"));
    const method = z.enum(["PIX", "CARD"]).parse(formData.get("method"));
    const useCredit = formData.get("useCredit") === "on";
    const r = await startPayment(user, bookingId, method, useCredit);
    revalidatePath(`/conta/pedidos/${bookingId}/pagar`);
    if (r.paidWithCredit) paidWithCredit = bookingId;
  } catch (error) {
    return actionError(error);
  }
  // redirect fora do try: o Next sinaliza o redirecionamento lançando uma exceção própria.
  if (paidWithCredit) redirect(`/conta/pedidos/${paidWithCredit}?pago=credito`);
  return { ok: true };
}

/**
 * SOMENTE MODO SIMULAÇÃO: faz o papel do cliente pagando/recusando no
 * "provedor" e entrega o webhook ASSINADO pelo mesmo caminho de produção.
 */
export async function simulatePaymentAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    if (!activeGateway().isSimulated) return { message: "Simulação indisponível neste ambiente." };
    const user = await customerOrFail();
    const paymentId = z.uuid().parse(formData.get("paymentId"));
    const outcome = z.enum(["RECEIVED", "DECLINED"]).parse(formData.get("outcome"));
    const payment = await db.paymentTransaction.findFirst({ where: { id: paymentId, booking: { customerId: user.id }, status: "PENDING", isSimulated: true } });
    if (!payment?.providerPaymentId) return { message: "Cobrança simulada não encontrada." };
    await setSimulatedChargeOutcome(payment.providerPaymentId, outcome);
    const { body, headers } = signSimulatedWebhook({ type: outcome === "RECEIVED" ? "PAYMENT_RECEIVED" : "PAYMENT_DECLINED", chargeId: payment.providerPaymentId });
    await handleWebhook("simulated", headers, body);
    revalidatePath(`/conta/pedidos/${payment.bookingId}`);
    return { ok: true, message: outcome === "RECEIVED" ? "Pagamento SIMULADO aprovado." : "Pagamento SIMULADO recusado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function cancelPaidBookingAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await customerOrFail();
    const bookingId = z.uuid().parse(formData.get("bookingId"));
    const reason = z.string().trim().min(3, "Conte o motivo do cancelamento.").max(300).parse(formData.get("reason"));
    const choice = z.enum(["REFUND_FULL", "CREDIT", "REFUND_MINUS_FEE"]).parse(formData.get("choice"));
    const rule = await requestRefund({ bookingId, actor: { id: user.id, type: "CUSTOMER" }, reason, where: { customerId: user.id }, choice });
    revalidatePath(`/conta/pedidos/${bookingId}`);
    return { ok: true, message: `Pedido cancelado. ${rule}` };
  } catch (error) {
    if (error instanceof z.ZodError) return { message: error.issues[0]?.message };
    return actionError(error);
  }
}

export async function confirmCompletionAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await customerOrFail();
    const bookingId = z.uuid().parse(formData.get("bookingId"));
    await confirmCompletion(user, bookingId);
    revalidatePath(`/conta/pedidos/${bookingId}`);
    return { ok: true, message: "Obrigado! Serviço concluído. Que tal avaliar o profissional?" };
  } catch (error) {
    return actionError(error);
  }
}

export async function reportProblemAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const user = await customerOrFail();
    const bookingId = z.uuid().parse(formData.get("bookingId"));
    await reportProblem(user, bookingId, String(formData.get("message") ?? ""));
    revalidatePath(`/conta/pedidos/${bookingId}`);
    return { ok: true, message: "Recebemos seu relato. Nossa equipe vai analisar; o pagamento ao profissional fica retido." };
  } catch (error) {
    return actionError(error);
  }
}
