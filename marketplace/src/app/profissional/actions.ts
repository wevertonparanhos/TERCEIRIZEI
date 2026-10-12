"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/form";
import { echoValues } from "@/lib/form-state";
import { addDays, hhmmToMinutes, isValidLocalDate, localToUtc, WEEKDAYS } from "@/domain/availability";
import { InvalidTransitionError } from "@/domain/booking-state";
import { parseBRLToCents } from "@/domain/money";
import { providerReplySchema } from "@/domain/reviews";
import { fieldErrors, providerProfileSchema } from "@/lib/validation";
import { AuthorizationError, requirePermission } from "@/server/auth";
import { acceptBooking, BookingError, declineBooking } from "@/server/booking";
import { finishService, startService, uploadEvidence } from "@/server/completion";
import { PaymentError, requestRefund } from "@/server/payments/service";
import { db } from "@/server/db";

/** Perfil do prestador SEMPRE resolvido pela sessão — nunca por id enviado pelo navegador. */
async function currentProvider(
  permission:
    | "provider:profile:manage:own"
    | "provider:offers:manage:own"
    | "provider:schedule:manage:own"
    | "provider:bookings:read:own",
) {
  const user = await requirePermission(permission);
  const provider = await db.providerProfile.findUnique({ where: { userId: user.id } });
  if (!provider) throw new AuthorizationError("Perfil profissional não encontrado.");
  return { user, provider };
}

function failure(error: unknown): FormState {
  if (error instanceof AuthorizationError) return { message: error.message };
  console.error("[profissional]", error);
  return { message: "Não foi possível salvar agora. Tente novamente." };
}

export async function updateProviderProfileAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { provider } = await currentProvider("provider:profile:manage:own");
    const raw = Object.fromEntries(formData);
    const parsed = providerProfileSchema.safeParse({ ...raw, experienceYears: raw.experienceYears || undefined });
    if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos destacados.", values: echoValues(formData) };

    const d = parsed.data;
    await db.providerProfile.update({
      where: { id: provider.id },
      data: {
        displayName: d.displayName,
        bio: d.bio || null,
        phone: d.phone,
        whatsapp: d.whatsapp || null,
        baseCity: d.baseCity,
        baseState: d.baseState,
        experienceYears: d.experienceYears ?? null,
        qualifications: d.qualifications || null,
      },
    });
    revalidatePath("/profissional", "layout");
    return { ok: true, message: "Perfil atualizado." };
  } catch (error) {
    return failure(error);
  }
}

const categoryToggle = z.object({ categoryId: z.uuid(), enabled: z.enum(["true", "false"]) });

export async function toggleCategoryAction(formData: FormData): Promise<void> {
  const { provider } = await currentProvider("provider:offers:manage:own");
  const { categoryId, enabled } = categoryToggle.parse(Object.fromEntries(formData));

  const category = await db.serviceCategory.findFirst({ where: { id: categoryId, active: true } });
  if (!category) throw new Error("Categoria indisponível.");

  if (enabled === "true") {
    await db.providerCategory.upsert({
      where: { providerId_categoryId: { providerId: provider.id, categoryId } },
      create: { providerId: provider.id, categoryId },
      update: {},
    });
  } else {
    await db.$transaction([
      db.providerCategory.deleteMany({ where: { providerId: provider.id, categoryId } }),
      // Sair da categoria tira as ofertas do ar (preços ficam guardados para reativar).
      db.providerOffer.updateMany({
        where: { providerId: provider.id, service: { categoryId } },
        data: { active: false },
      }),
    ]);
  }
  revalidatePath("/profissional/servicos");
}

const MAX_PRICE_CENTS = 10_000_000; // R$ 100.000,00 por item — trava contra erro de digitação.

/**
 * Salva os preços do prestador para um serviço. Campo vazio = item não
 * oferecido. Mudanças valem só para pedidos FUTUROS: pedidos já criados
 * guardam o preço no snapshot e o banco impede alteração após confirmação.
 */
export async function saveServiceOffersAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, provider } = await currentProvider("provider:offers:manage:own");
    const serviceId = z.uuid().parse(formData.get("serviceId"));

    const service = await db.service.findFirst({
      where: { id: serviceId, active: true, published: true, pricingModel: { not: "QUOTE" } },
      include: {
        packages: { where: { active: true } },
        addons: { where: { active: true } },
        priceRules: { where: { active: true } },
      },
    });
    if (!service) return { message: "Serviço indisponível." };

    const enrolled = await db.providerCategory.findUnique({
      where: { providerId_categoryId: { providerId: provider.id, categoryId: service.categoryId } },
    });
    if (!enrolled) return { message: "Ative a categoria antes de definir preços." };

    type Target = { field: "packageId" | "addonId" | "priceRuleId"; id: string; label: string; withExtras: boolean };
    const targets: Target[] = [
      ...service.packages.map((p) => ({ field: "packageId" as const, id: p.id, label: p.name, withExtras: false })),
      ...service.addons.map((a) => ({ field: "addonId" as const, id: a.id, label: a.name, withExtras: false })),
      ...service.priceRules.map((r) => ({ field: "priceRuleId" as const, id: r.id, label: r.name, withExtras: true })),
    ];

    const errors: Record<string, string[]> = {};
    const parseMoney = (key: string, required: boolean): number | null => {
      const raw = String(formData.get(key) ?? "").trim();
      if (!raw) return required ? (errors[key] = ["Informe um valor."], null) : 0;
      const cents = parseBRLToCents(raw);
      if (cents === null || cents > MAX_PRICE_CENTS) {
        errors[key] = ["Valor inválido."];
        return null;
      }
      return cents;
    };

    const plans = targets.map((t) => {
      const priceRaw = String(formData.get(`price_${t.id}`) ?? "").trim();
      if (!priceRaw) return { t, remove: true as const };
      const price = parseMoney(`price_${t.id}`, true);
      if (price === 0) errors[`price_${t.id}`] = ["O valor deve ser maior que zero."];
      const base = t.withExtras ? parseMoney(`base_${t.id}`, false) : 0;
      const min = t.withExtras ? parseMoney(`min_${t.id}`, false) : 0;
      return { t, remove: false as const, price: price ?? 0, base: base ?? 0, min: min ?? 0 };
    });

    if (Object.keys(errors).length) return { errors, message: "Revise os valores destacados." };
    if (service.pricingModel === "FIXED" && service.packages.length && plans.every((p) => p.remove || p.t.field !== "packageId")) {
      return { message: "Informe o preço de pelo menos um pacote (ou deixe todos em branco e não salve)." };
    }

    await db.$transaction(async (tx) => {
      for (const plan of plans) {
        const target = {
          packageId: plan.t.field === "packageId" ? plan.t.id : null,
          addonId: plan.t.field === "addonId" ? plan.t.id : null,
          priceRuleId: plan.t.field === "priceRuleId" ? plan.t.id : null,
        };
        const existing = await tx.providerOffer.findFirst({ where: { providerId: provider.id, ...target } });

        if (plan.remove) {
          if (existing?.active) await tx.providerOffer.update({ where: { id: existing.id }, data: { active: false } });
          continue;
        }

        const data = { priceCents: plan.price, baseCents: plan.base, minTotalCents: plan.min, active: true };
        if (!existing) {
          const created = await tx.providerOffer.create({
            data: { providerId: provider.id, serviceId: service.id, ...target, ...data },
          });
          await tx.priceChange.create({
            data: { entityType: "provider_offer", entityId: created.id, field: "price_cents", oldValue: null, newValue: String(plan.price), changedBy: user.id },
          });
          continue;
        }

        const changed = (["priceCents", "baseCents", "minTotalCents"] as const).filter((k) => existing[k] !== data[k]);
        if (changed.length || !existing.active) {
          await tx.providerOffer.update({ where: { id: existing.id }, data });
          for (const k of changed) {
            await tx.priceChange.create({
              data: {
                entityType: "provider_offer",
                entityId: existing.id,
                field: k,
                oldValue: String(existing[k]),
                newValue: String(data[k]),
                changedBy: user.id,
              },
            });
          }
        }
      }
    });

    revalidatePath("/profissional/servicos");
    revalidatePath(`/servico/${service.slug}`);
    return { ok: true, message: "Preços salvos. Eles valem para novos pedidos." };
  } catch (error) {
    return failure(error);
  }
}

/** Resposta pública do profissional a uma avaliação SUA — uma única vez (o banco impede reedição). */
export async function replyToReviewAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { provider } = await currentProvider("provider:profile:manage:own");
    const reviewId = z.uuid().safeParse(formData.get("reviewId"));
    if (!reviewId.success) return { message: "Avaliação inválida." };
    const parsed = providerReplySchema.safeParse({ reply: formData.get("reply") });
    if (!parsed.success) return { errors: fieldErrors(parsed.error), values: echoValues(formData) };

    // updateMany com providerId da sessão: avaliação de outro profissional não é afetada.
    const result = await db.review.updateMany({
      where: { id: reviewId.data, providerId: provider.id, providerReply: null, status: "PUBLISHED" },
      data: { providerReply: parsed.data.reply, providerRepliedAt: new Date() },
    });
    if (result.count === 0) return { message: "Esta avaliação não pode mais ser respondida." };

    revalidatePath("/profissional/avaliacoes");
    revalidatePath(`/profissionais/${provider.id}`);
    return { ok: true, message: "Resposta publicada." };
  } catch (error) {
    return failure(error);
  }
}

// ── Agenda e regiões ───────────────────────────────────────────────────────

/** Substitui a semana de trabalho (uma janela por dia) e o intervalo entre serviços. */
export async function saveAvailabilityAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { provider } = await currentProvider("provider:schedule:manage:own");
    const buffer = z.coerce.number().int().min(0).max(240).safeParse(formData.get("bufferMinutes"));
    if (!buffer.success) return { errors: { bufferMinutes: ["Entre 0 e 240 minutos."] } };

    const windows: { weekday: number; startMinute: number; endMinute: number }[] = [];
    const errors: Record<string, string[]> = {};
    for (let d = 0; d < 7; d++) {
      if (formData.get(`day_${d}_on`) !== "on") continue;
      const start = hhmmToMinutes(String(formData.get(`day_${d}_start`) ?? ""));
      const end = hhmmToMinutes(String(formData.get(`day_${d}_end`) ?? ""));
      if (start === null || end === null || end <= start) {
        errors[`day_${d}`] = [`${WEEKDAYS[d]}: horário final deve ser depois do inicial.`];
        continue;
      }
      windows.push({ weekday: d, startMinute: start, endMinute: end });
    }
    if (Object.keys(errors).length) return { errors, message: "Revise os horários." };

    await db.$transaction([
      db.providerAvailability.deleteMany({ where: { providerId: provider.id } }),
      db.providerAvailability.createMany({ data: windows.map((w) => ({ ...w, providerId: provider.id })) }),
      db.providerProfile.update({ where: { id: provider.id }, data: { bufferMinutes: buffer.data } }),
    ]);
    revalidatePath("/profissional", "layout");
    return { ok: true, message: windows.length ? "Agenda salva." : "Agenda salva sem dias de atendimento: você não receberá pedidos." };
  } catch (error) {
    return failure(error);
  }
}

const timeOffSchema = z
  .object({
    from: z.string().refine(isValidLocalDate, "Data inválida."),
    to: z.string().refine(isValidLocalDate, "Data inválida."),
    reason: z.string().trim().max(120).optional().default(""),
  })
  .refine((v) => v.to >= v.from, { path: ["to"], message: "A data final deve ser igual ou depois da inicial." });

/** Bloqueia dias inteiros (folga, férias). Não cancela pedidos já confirmados. */
export async function addTimeOffAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { provider } = await currentProvider("provider:schedule:manage:own");
    const parsed = timeOffSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { errors: fieldErrors(parsed.error), values: echoValues(formData) };
    const { from, to, reason } = parsed.data;

    const startsAt = localToUtc(from, 0);
    const endsAt = localToUtc(addDays(to, 1), 0);
    const conflicts = await db.booking.count({
      where: { providerId: provider.id, status: { in: ["CONFIRMED", "IN_PROGRESS"] }, scheduledStart: { lt: endsAt }, blockedUntil: { gt: startsAt } },
    });
    await db.providerTimeOff.create({ data: { providerId: provider.id, startsAt, endsAt, reason: reason || null } });
    revalidatePath("/profissional/agenda");
    return {
      ok: true,
      message: conflicts
        ? `Folga registrada. Atenção: você tem ${conflicts} pedido(s) confirmado(s) nesse período — fale com o suporte para reagendar.`
        : "Folga registrada. Esses dias não aparecem mais para clientes.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function removeTimeOffAction(formData: FormData): Promise<void> {
  const { provider } = await currentProvider("provider:schedule:manage:own");
  const id = z.uuid().parse(formData.get("id"));
  await db.providerTimeOff.deleteMany({ where: { id, providerId: provider.id } });
  revalidatePath("/profissional/agenda");
}

/** Cidades atendidas (e, opcionalmente, só alguns bairros de cada uma). */
export async function saveServiceAreasAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { provider } = await currentProvider("provider:schedule:manage:own");
    const cities = await db.city.findMany({ where: { active: true }, select: { id: true } });
    const selected = cities
      .filter((c) => formData.get(`city_${c.id}`) === "on")
      .map((c) => ({
        cityId: c.id,
        neighborhoods: String(formData.get(`hoods_${c.id}`) ?? "")
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
          .slice(0, 50),
      }));

    await db.$transaction([
      db.providerServiceArea.deleteMany({ where: { providerId: provider.id } }),
      db.providerServiceArea.createMany({ data: selected.map((s) => ({ ...s, providerId: provider.id })) }),
    ]);
    revalidatePath("/profissional", "layout");
    return { ok: true, message: selected.length ? "Regiões salvas." : "Nenhuma cidade selecionada: você não aparecerá nas buscas." };
  } catch (error) {
    return failure(error);
  }
}

// ── Aceite de pedidos ──────────────────────────────────────────────────────

const bookingIdSchema = z.uuid();

export async function acceptBookingAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, provider } = await currentProvider("provider:bookings:read:own");
    const id = bookingIdSchema.safeParse(formData.get("bookingId"));
    if (!id.success) return { message: "Pedido inválido." };
    await acceptBooking(provider.id, user.id, id.data);
    revalidatePath("/profissional/pedidos");
    return { ok: true, message: "Pedido aceito! O cliente foi avisado para fazer o pagamento." };
  } catch (error) {
    if (error instanceof BookingError || error instanceof InvalidTransitionError) return { message: error.message };
    return failure(error);
  }
}

export async function declineBookingAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, provider } = await currentProvider("provider:bookings:read:own");
    const id = bookingIdSchema.safeParse(formData.get("bookingId"));
    if (!id.success) return { message: "Pedido inválido." };
    await declineBooking(provider.id, user.id, id.data, String(formData.get("reason") ?? ""));
    revalidatePath("/profissional/pedidos");
    return { ok: true, message: "Pedido recusado. O horário foi liberado e o cliente avisado." };
  } catch (error) {
    if (error instanceof BookingError || error instanceof InvalidTransitionError) return { message: error.message };
    return failure(error);
  }
}

// ── Execução do serviço ────────────────────────────────────────────────────

function execError(error: unknown): FormState {
  if (error instanceof BookingError || error instanceof InvalidTransitionError || error instanceof PaymentError) return { message: error.message };
  return failure(error);
}

export async function startServiceAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user } = await currentProvider("provider:bookings:read:own");
    await startService(user, bookingIdSchema.parse(formData.get("bookingId")));
    revalidatePath("/profissional/pedidos");
    return { ok: true, message: "Atendimento iniciado. Ao terminar, envie fotos/vídeos e finalize." };
  } catch (error) {
    return execError(error);
  }
}

export async function uploadEvidenceAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user } = await currentProvider("provider:bookings:read:own");
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    const n = await uploadEvidence(user, bookingIdSchema.parse(formData.get("bookingId")), files);
    revalidatePath("/profissional/pedidos");
    return { ok: true, message: `${n} arquivo(s) enviado(s).` };
  } catch (error) {
    return execError(error);
  }
}

export async function finishServiceAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user } = await currentProvider("provider:bookings:read:own");
    await finishService(user, bookingIdSchema.parse(formData.get("bookingId")));
    revalidatePath("/profissional/pedidos");
    return { ok: true, message: "Serviço finalizado! O cliente tem 48h para confirmar ou relatar problema; depois disso o repasse é liberado." };
  } catch (error) {
    return execError(error);
  }
}

/** Profissional não poderá comparecer: cancela com reembolso INTEGRAL ao cliente. */
export async function providerCancelAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const { user, provider } = await currentProvider("provider:bookings:read:own");
    const bookingId = bookingIdSchema.parse(formData.get("bookingId"));
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason.length < 5) return { message: "Explique o motivo ao cliente." };
    await requestRefund({ bookingId, actor: { id: user.id, type: "PROVIDER" }, reason, where: { providerId: provider.id } });
    revalidatePath("/profissional/pedidos");
    return { ok: true, message: "Pedido cancelado. O cliente recebe reembolso integral." };
  } catch (error) {
    return execError(error);
  }
}
