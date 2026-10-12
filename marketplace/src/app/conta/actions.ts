"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/form";
import { can } from "@/domain/permissions";
import { canReview, reviewInputSchema } from "@/domain/reviews";
import { echoValues } from "@/lib/form-state";
import { fieldErrors, profileSchema } from "@/lib/validation";
import { getSessionUser } from "@/server/auth";
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
