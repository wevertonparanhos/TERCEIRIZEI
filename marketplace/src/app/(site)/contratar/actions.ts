"use server";

import { z } from "zod";
import { formatLocalTime, isValidLocalDate } from "@/domain/availability";
import { can } from "@/domain/permissions";
import { PricingError } from "@/domain/pricing";
import { getSessionUser } from "@/server/auth";
import { BookingError, bookingSchema, checkoutSchema, createBooking, priceCheckout } from "@/server/booking";
import { getProviderSlots } from "@/server/scheduling";

type Fail = { ok: false; error: string };

function toFail(error: unknown): Fail {
  if (error instanceof BookingError || error instanceof PricingError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Dados inválidos." };
  console.error("[checkout]", error);
  return { ok: false, error: "Não foi possível concluir agora. Tente novamente." };
}

/** Prévia do preço calculada no servidor (a mesma conta usada ao criar o pedido). */
export async function previewQuoteAction(input: unknown) {
  try {
    const { quote, items } = await priceCheckout(checkoutSchema.parse(input));
    return {
      ok: true as const,
      durationMinutes: items.durationMinutes,
      lines: quote.lines.map((l) => ({ name: l.name, quantity: l.quantity, totalCents: l.totalCents })),
      providerSubtotalCents: quote.providerSubtotalCents,
      commissionCents: quote.commissionCents,
      commissionRateBps: quote.commissionRateBps,
      commissionMode: quote.commissionMode,
      discountCents: quote.discountCents,
      totalCents: quote.totalCents,
    };
  } catch (error) {
    return toFail(error);
  }
}

/** Horários livres do profissional num dia, para a duração do que foi escolhido. */
export async function slotsAction(input: unknown, date: string) {
  try {
    if (!isValidLocalDate(date)) return { ok: false as const, error: "Data inválida." };
    const parsed = checkoutSchema.parse(input);
    const { items, provider } = await priceCheckout(parsed);
    const slots = await getProviderSlots(provider.id, date, items.durationMinutes);
    return { ok: true as const, slots: slots.map((s) => ({ start: s.start.toISOString(), label: `${formatLocalTime(s.start)} – ${formatLocalTime(s.end)}` })) };
  } catch (error) {
    return toFail(error);
  }
}

export async function createBookingAction(input: unknown) {
  const user = await getSessionUser();
  if (!user || !can(user.role, "booking:create")) return { ok: false as const, error: "Entre com uma conta de cliente para contratar." };
  try {
    const booking = await createBooking(user, bookingSchema.parse(input));
    return { ok: true as const, bookingId: booking.id };
  } catch (error) {
    return toFail(error);
  }
}
