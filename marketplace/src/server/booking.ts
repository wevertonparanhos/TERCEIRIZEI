import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isValidLocalDate, utcToLocalDate } from "@/domain/availability";
import { assertTransition, providerResponseDeadline, type BookingStatus } from "@/domain/booking-state";
import { buildCheckoutItems, generateBookingCode, type CheckoutChoice } from "@/domain/checkout";
import { resolveCommission } from "@/domain/commission";
import { computeQuote, PricingError } from "@/domain/pricing";
import { env } from "@/lib/env";
import { audit } from "./audit";
import type { SessionUser } from "./auth";
import { getActiveCommissionRules, LIVE_OFFER } from "./catalog";
import { db } from "./db";
import { expireStaleHolds, getProviderSlots } from "./scheduling";
import { getSettings } from "./settings";

export class BookingError extends Error {}

const addonsSchema = z
  .record(z.uuid(), z.coerce.number().int().min(0).max(50))
  .default({})
  .transform((m) => Object.fromEntries(Object.entries(m).filter(([, q]) => q > 0)));

export const checkoutSchema = z.object({
  serviceId: z.uuid(),
  providerId: z.uuid(),
  packageId: z.uuid().optional(),
  ruleId: z.uuid().optional(),
  quantity: z.coerce.number().int().min(1).max(100_000).optional(),
  addons: addonsSchema,
});

export const bookingSchema = checkoutSchema.extend({
  addressId: z.uuid(),
  date: z.string().refine(isValidLocalDate, "Data inválida."),
  start: z.iso.datetime(),
  bedrooms: z.coerce.number().int().min(0).max(30).optional(),
  bathrooms: z.coerce.number().int().min(0).max(30).optional(),
  areaM2: z.coerce.number().int().min(0).max(100_000).optional(),
  hasPets: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional().default(""),
  acceptTerms: z.literal(true, { error: "É preciso aceitar os termos e a política de cancelamento." }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;

/**
 * Carrega serviço, profissional e ofertas e calcula o orçamento. Usado tanto
 * na prévia de preço quanto na criação do pedido (mesma regra, sempre no servidor).
 */
export async function priceCheckout(input: CheckoutInput) {
  const service = await db.service.findFirst({
    where: { id: input.serviceId, active: true, published: true, pricingModel: { not: "QUOTE" }, category: { active: true } },
    include: {
      category: true,
      cancellationPolicy: true,
      packages: { where: { active: true } },
      addons: { where: { active: true } },
      priceRules: { where: { active: true } },
    },
  });
  if (!service) throw new BookingError("Serviço indisponível para contratação online.");

  const provider = await db.providerProfile.findFirst({
    where: {
      id: input.providerId,
      status: "APPROVED",
      user: { status: "ACTIVE" },
      categories: { some: { categoryId: service.categoryId } },
    },
    include: { user: { select: { isDemo: true } } },
  });
  if (!provider) throw new BookingError("Profissional indisponível para este serviço.");

  const offers = await db.providerOffer.findMany({
    where: { ...LIVE_OFFER, providerId: provider.id, serviceId: service.id },
  });

  const choice: CheckoutChoice =
    service.pricingModel === "FIXED"
      ? { model: "FIXED", packageId: input.packageId ?? "", addons: input.addons }
      : { model: "CALCULATED", ruleId: input.ruleId ?? "", quantity: input.quantity ?? 0, addons: input.addons };

  const items = buildCheckoutItems({ choice, packages: service.packages, rules: service.priceRules, addons: service.addons, offers });

  const [rules, settings] = await Promise.all([getActiveCommissionRules(), getSettings()]);
  const commission = resolveCommission(rules, { categoryId: service.categoryId, serviceId: service.id, at: new Date() });
  const quote = computeQuote({
    lines: items.lines,
    commissionRateBps: commission.rateBps,
    commissionMode: settings.commissionMode,
    discountBearer: settings.discountBearer,
    // Taxa do meio de pagamento é definida na Fase 3 (depende do método escolhido).
    fee: { bps: 0, fixedCents: 0 },
    feeBearer: settings.feeBearer,
  });

  return { service, provider, items, quote, settings };
}

const ACTIVE_ADDRESS_CITY = (city: string, state: string) =>
  ({ city: { name: { equals: city, mode: "insensitive" }, state, active: true } }) satisfies Prisma.ProviderServiceAreaWhereInput;

/**
 * Cria a SOLICITAÇÃO (AWAITING_PROVIDER): o horário fica segurado até o prazo
 * de resposta do profissional. Pagamento só depois do aceite.
 */
export async function createBooking(user: SessionUser, input: BookingInput) {
  await expireStaleHolds();
  const { service, provider, items, quote, settings } = await priceCheckout(input);

  if (env().PAYMENT_MODE === "live" && provider.user.isDemo) {
    throw new BookingError("Profissional de demonstração não pode ser contratado em produção.");
  }

  const address = await db.address.findFirst({ where: { id: input.addressId, userId: user.id } });
  if (!address) throw new BookingError("Endereço não encontrado.");

  const servesCity = await db.providerServiceArea.findFirst({
    where: { providerId: provider.id, ...ACTIVE_ADDRESS_CITY(address.city, address.state) },
  });
  if (!servesCity) throw new BookingError(`Este profissional não atende ${address.city}/${address.state}.`);
  if (servesCity.neighborhoods.length > 0 && !servesCity.neighborhoods.some((n) => n.toLowerCase() === address.neighborhood.toLowerCase())) {
    throw new BookingError(`Este profissional não atende o bairro ${address.neighborhood}.`);
  }

  // O horário precisa ser um dos livres calculados AGORA (não vale horário inventado).
  const start = new Date(input.start);
  if (utcToLocalDate(start) !== input.date) throw new BookingError("Horário inválido.");
  const slots = await getProviderSlots(provider.id, input.date, items.durationMinutes);
  const slot = slots.find((s) => s.start.getTime() === start.getTime());
  if (!slot) throw new BookingError("Este horário não está mais disponível. Escolha outro.");

  const now = new Date();
  const snapshot = {
    version: 1,
    service: { id: service.id, name: service.name, category: service.category.name, pricingModel: service.pricingModel },
    package: items.packageId ? service.packages.find((p) => p.id === items.packageId) : null,
    summary: items.summary,
    durationMinutes: items.durationMinutes,
    lines: quote.lines,
    quote,
    provider: { id: provider.id, displayName: provider.displayName },
    address: { label: address.label, cep: address.cep, street: address.street, number: address.number, complement: address.complement, neighborhood: address.neighborhood, city: address.city, state: address.state },
    cancellationPolicy: service.cancellationPolicy ? { name: service.cancellationPolicy.name, description: service.cancellationPolicy.description, tiers: service.cancellationPolicy.tiers } : null,
    termsVersion: settings.termsVersion,
    paymentMode: env().PAYMENT_MODE,
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateBookingCode((n) => randomBytes(n));
    try {
      return await db.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            code,
            customerId: user.id,
            providerId: provider.id,
            serviceId: service.id,
            packageId: items.packageId,
            addressId: address.id,
            status: "AWAITING_PROVIDER",
            scheduledStart: slot.start,
            scheduledEnd: slot.end,
            blockedUntil: slot.blockedUntil,
            providerResponseDeadline: providerResponseDeadline(now, slot.start, settings.providerResponseHours),
            propertyDetails: { bedrooms: input.bedrooms ?? null, bathrooms: input.bathrooms ?? null, areaM2: input.areaM2 ?? null, hasPets: input.hasPets },
            notes: input.notes || null,
            snapshot: snapshot as unknown as Prisma.InputJsonValue,
            providerSubtotalCents: quote.providerSubtotalCents,
            commissionMode: quote.commissionMode,
            grossCents: quote.grossCents,
            discountCents: quote.discountCents,
            totalCents: quote.totalCents,
            commissionRateBps: quote.commissionRateBps,
            commissionCents: quote.commissionCents,
            providerShareCents: quote.providerShareCents,
            paymentFeeCents: quote.feeCents,
            discountBearer: quote.discountBearer,
            feeBearer: quote.feeBearer,
            termsVersion: settings.termsVersion,
            termsAcceptedAt: now,
            items: {
              create: quote.lines.map((l) => ({
                kind: l.kind,
                refId: l.refId,
                name: l.name,
                unitPriceCents: l.unitPriceCents,
                quantity: l.quantity,
                totalCents: l.totalCents,
              })),
            },
            statusHistory: {
              create: { fromStatus: null, toStatus: "AWAITING_PROVIDER", actorId: user.id, actorType: "CUSTOMER", reason: "Solicitação enviada ao profissional" },
            },
          },
        });
        return booking;
      });
    } catch (error) {
      if (isOverlapError(error)) throw new BookingError("Alguém acabou de reservar este horário. Escolha outro.");
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue; // código repetido
      throw error;
    }
  }
  throw new BookingError("Não foi possível gerar o pedido. Tente novamente.");
}

/** A exclusion constraint do banco (23P01) barrou reserva simultânea do mesmo horário. */
function isOverlapError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return text.includes("bookings_no_overlap") || text.includes("23P01");
}

/** Muda o status validando a máquina de estados e grava histórico (+ auditoria quando admin). */
export async function transitionBooking(params: {
  bookingId: string;
  to: BookingStatus;
  actor: { id: string | null; type: "CUSTOMER" | "PROVIDER" | "ADMIN" | "SUPPORT" | "SYSTEM" };
  reason?: string;
  where?: Prisma.BookingWhereInput;
  /** Campos extras gravados junto com a mudança de status. */
  data?: Prisma.BookingUpdateManyMutationInput;
}) {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id: params.bookingId, ...params.where } });
    if (!booking) throw new BookingError("Pedido não encontrado.");
    assertTransition(booking.status, params.to, params.actor.type);

    // Atualização condicional: se outro processo mudou o status antes, nada acontece.
    const updated = await tx.booking.updateMany({
      where: { id: booking.id, status: booking.status },
      data: {
        status: params.to,
        ...(params.to === "CANCELLED" || params.to === "EXPIRED" ? { cancelledAt: new Date(), cancelReason: params.reason ?? null } : {}),
        ...(params.to === "COMPLETED" ? { completedAt: new Date() } : {}),
        ...params.data,
      },
    });
    if (updated.count === 0) throw new BookingError("O pedido mudou de situação. Atualize a página.");

    await tx.bookingStatusHistory.create({
      data: { bookingId: booking.id, fromStatus: booking.status, toStatus: params.to, actorId: params.actor.id, actorType: params.actor.type, reason: params.reason ?? null },
    });
    if (params.actor.type === "ADMIN" || params.actor.type === "SUPPORT") {
      await audit(
        { actorId: params.actor.id, action: `booking.${params.to.toLowerCase()}`, entityType: "booking", entityId: booking.id, description: `Pedido ${booking.code}: ${booking.status} → ${params.to}`, metadata: { reason: params.reason ?? null } },
        tx,
      );
    }
    return { ...booking, status: params.to };
  });
}

export { PricingError };

/** Profissional aceita a solicitação → cliente tem um prazo para pagar. */
export async function acceptBooking(providerId: string, actorUserId: string, bookingId: string) {
  await expireStaleHolds();
  const [booking, settings] = await Promise.all([
    db.booking.findFirst({ where: { id: bookingId, providerId, status: "AWAITING_PROVIDER" } }),
    getSettings(),
  ]);
  if (!booking) throw new BookingError("Solicitação não encontrada ou já respondida.");
  const now = new Date();
  if (booking.providerResponseDeadline && booking.providerResponseDeadline < now) throw new BookingError("O prazo para responder terminou.");
  const payBy = new Date(Math.min(now.getTime() + settings.holdMinutes * 60_000, booking.scheduledStart.getTime()));
  return transitionBooking({
    bookingId,
    to: "AWAITING_PAYMENT",
    actor: { id: actorUserId, type: "PROVIDER" },
    reason: "Aceito pelo profissional",
    where: { providerId },
    data: { providerRespondedAt: now, holdExpiresAt: payBy },
  });
}

/** Profissional recusa (motivo obrigatório, visível ao cliente). Nada foi cobrado. */
export async function declineBooking(providerId: string, actorUserId: string, bookingId: string, reason: string) {
  const text = reason.trim();
  if (text.length < 5) throw new BookingError("Explique brevemente o motivo da recusa.");
  return transitionBooking({
    bookingId,
    to: "DECLINED",
    actor: { id: actorUserId, type: "PROVIDER" },
    reason: `Recusado pelo profissional: ${text.slice(0, 300)}`,
    where: { providerId, status: "AWAITING_PROVIDER" },
    data: { providerRespondedAt: new Date(), declineReason: text.slice(0, 300), cancelledAt: new Date() },
  });
}
