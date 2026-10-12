"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import type { FormState } from "@/components/ui/form";
import type { Permission } from "@/domain/permissions";
import { audit } from "@/server/audit";
import { AuthorizationError, requirePermission, type SessionUser } from "@/server/auth";
import { db } from "@/server/db";
import { InvalidTransitionError } from "@/domain/booking-state";
import { parseBRLToCents } from "@/domain/money";
import { BookingError, transitionBooking } from "@/server/booking";
import { PaymentError, reconcilePendingPayments, releasePayout, requestRefund } from "@/server/payments/service";

/**
 * Envelope de toda ação administrativa: checa a permissão no servidor,
 * valida a entrada com Zod e executa mudança + auditoria numa transação.
 */
async function run<T extends z.ZodType>(
  permission: Permission,
  schema: T,
  formData: FormData,
  fn: (input: z.infer<T>, actor: SessionUser, tx: Prisma.TransactionClient) => Promise<string>,
  paths: string[],
): Promise<FormState> {
  try {
    const actor = await requirePermission(permission);
    const parsed = schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      return { errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>, message: "Revise os campos destacados." };
    }
    const message = await db.$transaction((tx) => fn(parsed.data, actor, tx));
    paths.forEach((p) => revalidatePath(p));
    return { ok: true, message };
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof AdminRuleError) return { message: error.message };
    console.error("[admin]", error);
    return { message: "Não foi possível concluir a ação. Tente novamente." };
  }
}

class AdminRuleError extends Error {}

const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());
const optionalText = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);
const lines = z
  .string()
  .optional()
  .transform((v) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean));
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use letras minúsculas, números e hífens.");

// ── Profissionais ──────────────────────────────────────────────────────────

const providerDecision = z.object({
  providerId: z.uuid(),
  decision: z.enum(["APPROVED", "REJECTED", "SUSPENDED"]),
  reason: z.string().trim().max(500).optional().default(""),
});

export async function decideProviderAction(_: FormState, formData: FormData) {
  return run("admin:providers:approve", providerDecision, formData, async (input, actor, tx) => {
    if (input.decision !== "APPROVED" && input.reason.length < 5) {
      throw new AdminRuleError("Informe o motivo (será exibido ao profissional).");
    }
    const provider = await tx.providerProfile.findUniqueOrThrow({ where: { id: input.providerId } });
    await tx.providerProfile.update({
      where: { id: provider.id },
      data: {
        status: input.decision,
        statusReason: input.reason || null,
        approvedAt: input.decision === "APPROVED" ? new Date() : provider.approvedAt,
      },
    });
    await audit(
      {
        actorId: actor.id,
        action: `provider.${input.decision.toLowerCase()}`,
        entityType: "provider_profile",
        entityId: provider.id,
        description: `Profissional "${provider.displayName}": ${provider.status} → ${input.decision}`,
        metadata: { reason: input.reason || null },
      },
      tx,
    );
    return input.decision === "APPROVED" ? "Profissional aprovado e publicado." : "Status atualizado.";
  }, ["/admin/profissionais", "/admin"]);
}

// ── Categorias ─────────────────────────────────────────────────────────────

const categorySchema = z.object({
  id: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(2).max(60),
  slug,
  description: optionalText(300),
  icon: optionalText(40),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: checkbox,
  requiresQualification: checkbox,
  qualificationNote: optionalText(300),
});

export async function saveCategoryAction(_: FormState, formData: FormData) {
  return run("admin:catalog:manage", categorySchema, formData, async ({ id, ...data }, actor, tx) => {
    const clash = await tx.serviceCategory.findFirst({ where: { slug: data.slug, NOT: id ? { id } : undefined } });
    if (clash) throw new AdminRuleError("Já existe uma categoria com este endereço (slug).");

    const saved = id
      ? await tx.serviceCategory.update({ where: { id }, data })
      : await tx.serviceCategory.create({ data });
    await audit(
      {
        actorId: actor.id,
        action: id ? "category.update" : "category.create",
        entityType: "service_category",
        entityId: saved.id,
        description: `Categoria "${saved.name}" ${id ? "atualizada" : "criada"}`,
        metadata: data,
      },
      tx,
    );
    return id ? "Categoria atualizada." : "Categoria criada.";
  }, ["/admin/categorias", "/servicos", "/"]);
}

// ── Serviços, pacotes e adicionais ─────────────────────────────────────────

const servicePublish = z.object({ serviceId: z.uuid(), published: z.enum(["true", "false"]) });

export async function toggleServicePublishedAction(_: FormState, formData: FormData) {
  return run("admin:catalog:manage", servicePublish, formData, async (input, actor, tx) => {
    const published = input.published === "true";
    const service = await tx.service.update({ where: { id: input.serviceId }, data: { published } });
    await audit(
      {
        actorId: actor.id,
        action: published ? "service.publish" : "service.unpublish",
        entityType: "service",
        entityId: service.id,
        description: `Serviço "${service.name}" ${published ? "publicado" : "despublicado"}`,
      },
      tx,
    );
    return published ? "Serviço publicado." : "Serviço retirado do ar.";
  }, ["/admin/servicos", "/servicos"]);
}

const serviceSchema = z.object({
  serviceId: z.uuid(),
  name: z.string().trim().min(2).max(80),
  summary: optionalText(200),
  description: optionalText(1500),
});

export async function updateServiceAction(_: FormState, formData: FormData) {
  return run("admin:catalog:manage", serviceSchema, formData, async ({ serviceId, ...data }, actor, tx) => {
    const service = await tx.service.update({ where: { id: serviceId }, data });
    await audit(
      { actorId: actor.id, action: "service.update", entityType: "service", entityId: service.id, description: `Serviço "${service.name}" atualizado`, metadata: data },
      tx,
    );
    return "Serviço atualizado.";
  }, ["/admin/servicos", "/servicos"]);
}

const packageSchema = z.object({
  serviceId: z.uuid(),
  packageId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(2).max(80),
  slug,
  description: z.string().trim().min(5).max(500),
  durationMinutes: z.coerce.number().int().min(15).max(24 * 60),
  professionals: z.coerce.number().int().min(1).max(10),
  bedrooms: z.coerce.number().int().min(0).max(20).optional().or(z.literal("").transform(() => undefined)),
  bathrooms: z.coerce.number().int().min(0).max(20).optional().or(z.literal("").transform(() => undefined)),
  maxAreaM2: z.coerce.number().int().min(1).max(10_000).optional().or(z.literal("").transform(() => undefined)),
  includedItems: lines,
  excludedItems: lines,
  suppliesBy: z.enum(["CUSTOMER", "PROVIDER", "SHARED"]),
  suppliesNote: optionalText(300),
  conditions: optionalText(500),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: checkbox,
});

/** Edita o ESCOPO do pacote. Pedidos existentes guardam snapshot e não são afetados. */
export async function savePackageAction(_: FormState, formData: FormData) {
  return run("admin:catalog:manage", packageSchema, formData, async ({ serviceId, packageId, ...data }, actor, tx) => {
    const service = await tx.service.findUniqueOrThrow({ where: { id: serviceId } });
    if (service.pricingModel !== "FIXED") throw new AdminRuleError("Pacotes só existem em serviços de preço fixo.");
    if (data.includedItems.length === 0) throw new AdminRuleError("Informe ao menos um item incluso.");

    const payload = { ...data, bedrooms: data.bedrooms ?? null, bathrooms: data.bathrooms ?? null, maxAreaM2: data.maxAreaM2 ?? null };
    const saved = packageId
      ? await tx.servicePackage.update({ where: { id: packageId, serviceId }, data: payload })
      : await tx.servicePackage.create({ data: { ...payload, serviceId } });
    await audit(
      {
        actorId: actor.id,
        action: packageId ? "package.update" : "package.create",
        entityType: "service_package",
        entityId: saved.id,
        description: `Pacote "${saved.name}" (${service.name}) ${packageId ? "atualizado" : "criado"}`,
      },
      tx,
    );
    return packageId ? "Pacote atualizado." : "Pacote criado.";
  }, ["/admin/servicos", "/servicos"]);
}

const addonSchema = z.object({
  serviceId: z.uuid(),
  addonId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  name: z.string().trim().min(2).max(80),
  description: optionalText(300),
  pricing: z.enum(["FIXED", "PER_UNIT"]),
  unitLabel: optionalText(30),
  maxQuantity: z.coerce.number().int().min(1).max(50),
  durationMinutes: z.coerce.number().int().min(0).max(600),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: checkbox,
});

export async function saveAddonAction(_: FormState, formData: FormData) {
  return run("admin:catalog:manage", addonSchema, formData, async ({ serviceId, addonId, ...data }, actor, tx) => {
    if (data.pricing === "PER_UNIT" && !data.unitLabel) throw new AdminRuleError("Informe a unidade (ex.: janela).");
    const saved = addonId
      ? await tx.serviceAddon.update({ where: { id: addonId, serviceId }, data })
      : await tx.serviceAddon.create({ data: { ...data, serviceId } });
    await audit(
      {
        actorId: actor.id,
        action: addonId ? "addon.update" : "addon.create",
        entityType: "service_addon",
        entityId: saved.id,
        description: `Adicional "${saved.name}" ${addonId ? "atualizado" : "criado"}`,
      },
      tx,
    );
    return addonId ? "Adicional atualizado." : "Adicional criado.";
  }, ["/admin/servicos", "/servicos"]);
}

// ── Comissões ──────────────────────────────────────────────────────────────

const percentToBps = z
  .string()
  .trim()
  .transform((v) => v.replace(",", "."))
  .refine((v) => /^\d{1,3}(\.\d{1,2})?$/.test(v), "Use um percentual como 20 ou 17,5.")
  .transform((v) => Math.round(Number(v) * 100))
  .refine((bps) => bps >= 0 && bps <= 5000, "A comissão deve ficar entre 0% e 50%.");

const commissionSchema = z.object({
  scope: z.enum(["GLOBAL", "CATEGORY"]),
  categoryId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
  rate: percentToBps,
});

/**
 * Nunca edita a regra vigente: encerra a atual (valid_to = agora) e cria uma
 * nova. Pedidos já criados mantêm a taxa gravada neles.
 */
export async function setCommissionAction(_: FormState, formData: FormData) {
  return run("admin:commission:manage", commissionSchema, formData, async (input, actor, tx) => {
    if (input.scope === "CATEGORY" && !input.categoryId) throw new AdminRuleError("Escolha a categoria.");
    const now = new Date();
    const where = input.scope === "GLOBAL" ? { scope: "GLOBAL" as const, active: true } : { scope: "CATEGORY" as const, categoryId: input.categoryId, active: true };
    const current = await tx.commissionRule.findFirst({ where });
    if (current?.rateBps === input.rate) throw new AdminRuleError("A comissão informada é igual à atual.");

    if (current) await tx.commissionRule.update({ where: { id: current.id }, data: { active: false, validTo: now } });
    const created = await tx.commissionRule.create({
      data: { scope: input.scope, categoryId: input.scope === "CATEGORY" ? input.categoryId : null, rateBps: input.rate, validFrom: now, createdBy: actor.id },
    });
    await tx.priceChange.create({
      data: { entityType: "commission_rule", entityId: created.id, field: "rate_bps", oldValue: current ? String(current.rateBps) : null, newValue: String(input.rate), changedBy: actor.id },
    });
    await audit(
      {
        actorId: actor.id,
        action: "commission.set",
        entityType: "commission_rule",
        entityId: created.id,
        description: `Comissão ${input.scope === "GLOBAL" ? "global" : "da categoria"}: ${current ? current.rateBps / 100 : "—"}% → ${input.rate / 100}%`,
        metadata: { scope: input.scope, categoryId: input.categoryId ?? null, from: current?.rateBps ?? null, to: input.rate },
      },
      tx,
    );
    return "Comissão atualizada. Vale para novos pedidos.";
  }, ["/admin/comissoes", "/servicos"]);
}

const removeCategoryCommission = z.object({ ruleId: z.uuid() });

export async function removeCategoryCommissionAction(_: FormState, formData: FormData) {
  return run("admin:commission:manage", removeCategoryCommission, formData, async ({ ruleId }, actor, tx) => {
    const rule = await tx.commissionRule.findUniqueOrThrow({ where: { id: ruleId } });
    if (rule.scope === "GLOBAL") throw new AdminRuleError("A comissão global não pode ser removida, apenas alterada.");
    await tx.commissionRule.update({ where: { id: rule.id }, data: { active: false, validTo: new Date() } });
    await audit(
      { actorId: actor.id, action: "commission.remove", entityType: "commission_rule", entityId: rule.id, description: `Comissão específica de ${rule.rateBps / 100}% encerrada` },
      tx,
    );
    return "Comissão específica removida. A categoria volta a usar a global.";
  }, ["/admin/comissoes", "/servicos"]);
}

// ── Usuários ───────────────────────────────────────────────────────────────

const userUpdate = z.object({
  userId: z.uuid(),
  role: z.enum(["CUSTOMER", "PROVIDER", "SUPPORT", "ADMIN"]),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function updateUserAction(_: FormState, formData: FormData) {
  return run("admin:users:manage", userUpdate, formData, async (input, actor, tx) => {
    if (input.userId === actor.id) throw new AdminRuleError("Você não pode alterar o próprio papel ou status.");
    const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId }, include: { providerProfile: true } });
    if (input.role === "PROVIDER" && !user.providerProfile) {
      await tx.providerProfile.create({ data: { userId: user.id, displayName: user.name } });
    }
    await tx.user.update({ where: { id: user.id }, data: { role: input.role, status: input.status } });
    await audit(
      {
        actorId: actor.id,
        action: "user.update",
        entityType: "user",
        entityId: user.id,
        description: `Usuário ${user.email}: ${user.role}/${user.status} → ${input.role}/${input.status}`,
        metadata: { from: { role: user.role, status: user.status }, to: input },
      },
      tx,
    );
    return "Usuário atualizado.";
  }, ["/admin/usuarios"]);
}

// ── Avaliações ─────────────────────────────────────────────────────────────

const moderation = z.object({
  reviewId: z.uuid(),
  status: z.enum(["PUBLISHED", "HIDDEN", "FLAGGED"]),
  reason: z.string().trim().max(300).optional().default(""),
});

/** Modera sem apagar: a avaliação continua registrada; a média do profissional é recalculada pelo banco. */
export async function moderateReviewAction(_: FormState, formData: FormData) {
  return run("admin:reviews:moderate", moderation, formData, async (input, actor, tx) => {
    if (input.status !== "PUBLISHED" && input.reason.length < 5) throw new AdminRuleError("Informe o motivo da moderação.");
    const review = await tx.review.findUniqueOrThrow({ where: { id: input.reviewId }, include: { provider: { select: { displayName: true } } } });
    if (review.status === input.status) throw new AdminRuleError("A avaliação já está neste estado.");
    await tx.review.update({
      where: { id: review.id },
      data: { status: input.status, moderationReason: input.reason || null, moderatedBy: actor.id, moderatedAt: new Date() },
    });
    await audit(
      {
        actorId: actor.id,
        action: `review.${input.status.toLowerCase()}`,
        entityType: "review",
        entityId: review.id,
        description: `Avaliação ${review.rating}★ de "${review.provider.displayName}": ${review.status} → ${input.status}`,
        metadata: { reason: input.reason || null },
      },
      tx,
    );
    return "Avaliação moderada.";
  }, ["/admin/avaliacoes", `/profissionais`]);
}

// ── Financeiro ─────────────────────────────────────────────────────────────

function finError(error: unknown): FormState {
  if (error instanceof AuthorizationError || error instanceof AdminRuleError || error instanceof PaymentError || error instanceof BookingError || error instanceof InvalidTransitionError) {
    return { message: error.message };
  }
  console.error("[admin/financeiro]", error);
  return { message: "Não foi possível concluir a operação." };
}

export async function releasePayoutAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("admin:finance:read");
    if (actor.role !== "ADMIN") throw new AuthorizationError("Somente administradores liberam repasses.");
    await releasePayout(actor, z.uuid().parse(formData.get("payoutId")));
    revalidatePath("/admin/financeiro");
    return { ok: true, message: "Repasse enviado." };
  } catch (error) {
    return finError(error);
  }
}

export async function reconcilePaymentsAction(): Promise<FormState> {
  try {
    await requirePermission("admin:finance:read");
    const r = await reconcilePendingPayments();
    revalidatePath("/admin/financeiro");
    return { ok: true, message: `Conciliação: ${r.checked} cobrança(s) pendente(s) consultada(s), ${r.updated} atualizada(s).` };
  } catch (error) {
    return finError(error);
  }
}

const adminRefundSchema = z.object({
  bookingId: z.uuid(),
  amount: z.string().trim().optional().default(""),
  reason: z.string().trim().min(5, "Informe o motivo.").max(300),
});

/** Mediação: reembolso total (vazio) ou parcial (valor em R$). */
export async function adminRefundAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("admin:refunds:manage");
    const input = adminRefundSchema.parse(Object.fromEntries(formData));
    const override = input.amount ? parseBRLToCents(input.amount) : undefined;
    if (input.amount && (override === null || override === undefined || override <= 0)) return { message: "Valor inválido." };
    const rule = await requestRefund({ bookingId: input.bookingId, actor: { id: actor.id, type: "ADMIN" }, reason: input.reason, amountOverrideCents: override ?? undefined });
    revalidatePath("/admin/financeiro");
    return { ok: true, message: `Reembolso iniciado. ${rule}` };
  } catch (error) {
    if (error instanceof z.ZodError) return { message: error.issues[0]?.message };
    return finError(error);
  }
}

/** Mediação a favor do profissional: pedido em análise → concluído (libera o repasse). */
export async function resolveDisputeCompletedAction(_: FormState, formData: FormData): Promise<FormState> {
  try {
    const actor = await requirePermission("admin:refunds:manage");
    const bookingId = z.uuid().parse(formData.get("bookingId"));
    const note = z.string().trim().min(5, "Registre a conclusão da análise.").max(300).parse(formData.get("note"));
    await transitionBooking({ bookingId, to: "COMPLETED", actor: { id: actor.id, type: "ADMIN" }, reason: `Análise concluída: ${note}` });
    revalidatePath("/admin/financeiro");
    return { ok: true, message: "Pedido concluído; repasse liberado." };
  } catch (error) {
    if (error instanceof z.ZodError) return { message: error.issues[0]?.message };
    return finError(error);
  }
}
