import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { resolveCommission, type CommissionRuleLike } from "@/domain/commission";
import { customerPrice } from "@/domain/pricing";
import { db } from "./db";
import { getSettings } from "./settings";

/** Ofertas válidas para o público: prestador aprovado, conta ativa, oferta ativa. */
export const LIVE_OFFER: Prisma.ProviderOfferWhereInput = {
  active: true,
  provider: { status: "APPROVED", user: { status: "ACTIVE" } },
};

export const getActiveCommissionRules = cache(async (): Promise<CommissionRuleLike[]> => {
  return db.commissionRule.findMany({ where: { active: true } });
});

async function pricingContext() {
  const [rules, settings] = await Promise.all([getActiveCommissionRules(), getSettings()]);
  return { rules, mode: settings.commissionMode, at: new Date() };
}

/** Converte o menor preço de prestador em preço ao cliente (com a comissão vigente). */
function toCustomer(
  ctx: Awaited<ReturnType<typeof pricingContext>>,
  categoryId: string,
  serviceId: string,
  providerCents: number | null,
) {
  if (providerCents === null) return null;
  const { rateBps } = resolveCommission(ctx.rules, { categoryId, serviceId, at: ctx.at });
  return customerPrice(providerCents, rateBps, ctx.mode);
}

async function minOfferByService(serviceIds: string[]) {
  if (serviceIds.length === 0) return new Map<string, number>();
  const rows = await db.providerOffer.groupBy({
    by: ["serviceId"],
    where: { ...LIVE_OFFER, serviceId: { in: serviceIds }, addonId: null },
    _min: { priceCents: true },
  });
  return new Map(rows.map((r) => [r.serviceId, r._min.priceCents ?? 0]));
}

export async function listCategories() {
  const ctx = await pricingContext();
  const categories = await db.serviceCategory.findMany({
    where: { active: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: { services: { where: { active: true, published: true }, select: { id: true } } },
  });
  const mins = await minOfferByService(categories.flatMap((c) => c.services.map((s) => s.id)));

  return categories.map((c) => {
    const prices = c.services
      .map((s) => toCustomer(ctx, c.id, s.id, mins.get(s.id) ?? null))
      .filter((p): p is number => p !== null);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      serviceCount: c.services.length,
      fromCents: prices.length ? Math.min(...prices) : null,
    };
  });
}

export async function getCategoryWithServices(slug: string) {
  const category = await db.serviceCategory.findFirst({
    where: { slug, active: true },
    include: {
      services: {
        where: { active: true, published: true },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { packages: { where: { active: true } } } } },
      },
    },
  });
  if (!category) return null;

  const ctx = await pricingContext();
  const mins = await minOfferByService(category.services.map((s) => s.id));
  const providerCounts = await db.providerOffer.groupBy({
    by: ["serviceId", "providerId"],
    where: { ...LIVE_OFFER, serviceId: { in: category.services.map((s) => s.id) } },
  });

  return {
    ...category,
    services: category.services.map((s) => ({
      ...s,
      fromCents: toCustomer(ctx, category.id, s.id, mins.get(s.id) ?? null),
      providerCount: providerCounts.filter((p) => p.serviceId === s.id).length,
    })),
  };
}

export async function getServiceDetail(slug: string) {
  const service = await db.service.findFirst({
    where: { slug, active: true, published: true, category: { active: true } },
    include: {
      category: true,
      cancellationPolicy: true,
      packages: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      addons: { where: { active: true }, orderBy: { sortOrder: "asc" } },
      priceRules: { where: { active: true } },
    },
  });
  if (!service) return null;

  const ctx = await pricingContext();
  const offers = await db.providerOffer.findMany({
    where: { ...LIVE_OFFER, serviceId: service.id },
    select: { providerId: true, packageId: true, addonId: true, priceRuleId: true, priceCents: true, minTotalCents: true },
  });

  const price = (cents: number | null) => toCustomer(ctx, service.categoryId, service.id, cents);
  const minOf = (list: typeof offers) => (list.length ? Math.min(...list.map((o) => o.priceCents)) : null);
  const { rateBps } = resolveCommission(ctx.rules, { categoryId: service.categoryId, serviceId: service.id, at: ctx.at });

  return {
    ...service,
    commissionRateBps: rateBps,
    commissionMode: ctx.mode,
    providerCount: new Set(offers.map((o) => o.providerId)).size,
    packages: service.packages.map((p) => {
      const list = offers.filter((o) => o.packageId === p.id);
      return { ...p, fromCents: price(minOf(list)), providerCount: list.length };
    }),
    addons: service.addons.map((a) => ({ ...a, fromCents: price(minOf(offers.filter((o) => o.addonId === a.id))) })),
    priceRules: service.priceRules.map((r) => {
      const list = offers.filter((o) => o.priceRuleId === r.id);
      const minTotal = list.length ? Math.min(...list.map((o) => o.minTotalCents)) : null;
      return { ...r, fromCents: price(minOf(list)), minTotalCents: price(minTotal), providerCount: list.length };
    }),
  };
}

export type ServiceDetail = NonNullable<Awaited<ReturnType<typeof getServiceDetail>>>;
