"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/form";
import { echoValues } from "@/lib/form-state";
import { parseBRLToCents } from "@/domain/money";
import { providerReplySchema } from "@/domain/reviews";
import { fieldErrors, providerProfileSchema } from "@/lib/validation";
import { AuthorizationError, requirePermission } from "@/server/auth";
import { db } from "@/server/db";

/** Perfil do prestador SEMPRE resolvido pela sessão — nunca por id enviado pelo navegador. */
async function currentProvider(permission: "provider:profile:manage:own" | "provider:offers:manage:own") {
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
