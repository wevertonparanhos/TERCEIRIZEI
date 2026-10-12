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
import { BookingError, transitionBooking } from "@/server/booking";
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
    await transitionBooking({
      bookingId: id.data,
      to: "CANCELLED",
      actor: { id: user.id, type: "CUSTOMER" },
      reason: "Cancelado pelo cliente antes do pagamento",
      where: { customerId: user.id, status: { in: ["AWAITING_PROVIDER", "AWAITING_PAYMENT"] } },
    });
  } catch (error) {
    if (error instanceof BookingError) return { message: error.message };
    if (error instanceof InvalidTransitionError) return { message: "Este pedido não pode mais ser cancelado por aqui. Fale com o suporte." };
    console.error("[cancel]", error);
    return { message: "Não foi possível cancelar agora." };
  }
  revalidatePath(`/conta/pedidos/${id.data}`);
  revalidatePath("/conta");
  return { ok: true, message: "Pedido cancelado e horário liberado." };
}
