import "server-only";
import { z } from "zod";
import { addDays, isValidLocalDate, utcToLocalDate } from "@/domain/availability";
import { resolveCommission } from "@/domain/commission";
import { parseBRLToCents } from "@/domain/money";
import { customerPrice } from "@/domain/pricing";
import { MIN_REVIEWS_FOR_AVERAGE } from "@/domain/reviews";
import { getActiveCommissionRules, LIVE_OFFER } from "./catalog";
import { db } from "./db";
import { countSlotsForProviders } from "./scheduling";
import { getSettings } from "./settings";

export const SORTS = { relevancia: "Mais relevantes", preco: "Menor preço", nota: "Melhor avaliação", disponibilidade: "Maior disponibilidade" } as const;
export type Sort = keyof typeof SORTS;

const slugLike = z.string().regex(/^[a-z0-9-]{1,80}$/).optional().catch(undefined);

export const searchSchema = z.object({
  categoria: slugLike,
  cidade: slugLike,
  preco_max: z.string().optional().catch(undefined),
  data: z.string().optional().catch(undefined).transform((v) => (v && isValidLocalDate(v) ? v : undefined)),
  nota_min: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
  modalidade: z.enum(["FIXED", "CALCULATED"]).optional().catch(undefined),
  ordenar: z.enum(Object.keys(SORTS) as [Sort, ...Sort[]]).optional().catch(undefined),
});

export type SearchFilters = z.infer<typeof searchSchema>;

export type SearchResult = {
  provider: { id: string; displayName: string; baseCity: string | null; baseState: string | null; experienceYears: number | null; ratingSum: number; ratingCount: number; isDemo: boolean };
  fromCents: number;
  services: { slug: string; name: string; fromCents: number }[];
  freeSlots: number;
};

/** Busca pública de profissionais. Só dados públicos (sem contato/endereço). */
export async function searchProviders(raw: Record<string, string | string[] | undefined>) {
  const f = searchSchema.parse(Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])));
  const priceMax = f.preco_max ? parseBRLToCents(f.preco_max) : null;

  const offers = await db.providerOffer.findMany({
    where: {
      ...LIVE_OFFER,
      addonId: null,
      service: {
        active: true,
        published: true,
        pricingModel: f.modalidade ? f.modalidade : { not: "QUOTE" },
        category: { active: true, ...(f.categoria ? { slug: f.categoria } : {}) },
      },
      ...(f.cidade ? { provider: { status: "APPROVED", user: { status: "ACTIVE" }, serviceAreas: { some: { city: { slug: f.cidade, active: true } } } } } : {}),
    },
    take: 2000,
    select: {
      priceCents: true,
      package: { select: { durationMinutes: true } },
      priceRule: { select: { baseMinutes: true, minutesPerUnit: true, minQuantity: true } },
      service: { select: { id: true, slug: true, name: true, categoryId: true } },
      provider: {
        select: { id: true, displayName: true, baseCity: true, baseState: true, experienceYears: true, ratingSum: true, ratingCount: true, user: { select: { isDemo: true } } },
      },
    },
  });

  const [rules, settings] = await Promise.all([getActiveCommissionRules(), getSettings()]);
  const at = new Date();

  type Acc = SearchResult & { minDuration: number };
  const byProvider = new Map<string, Acc>();
  for (const o of offers) {
    const { rateBps } = resolveCommission(rules, { categoryId: o.service.categoryId, serviceId: o.service.id, at });
    const price = customerPrice(o.priceCents, rateBps, settings.commissionMode);
    const duration = o.package?.durationMinutes ?? (o.priceRule ? o.priceRule.baseMinutes + o.priceRule.minutesPerUnit * o.priceRule.minQuantity : 60);
    const acc =
      byProvider.get(o.provider.id) ??
      ({
        provider: { ...o.provider, isDemo: o.provider.user.isDemo },
        fromCents: Number.POSITIVE_INFINITY,
        services: [],
        freeSlots: 0,
        minDuration: Number.POSITIVE_INFINITY,
      } satisfies Acc);
    acc.fromCents = Math.min(acc.fromCents, price);
    acc.minDuration = Math.min(acc.minDuration, duration);
    const svc = acc.services.find((s) => s.slug === o.service.slug);
    if (svc) svc.fromCents = Math.min(svc.fromCents, price);
    else acc.services.push({ slug: o.service.slug, name: o.service.name, fromCents: price });
    byProvider.set(o.provider.id, acc);
  }

  let results = [...byProvider.values()].filter((r) => {
    if (priceMax !== null && r.fromCents > priceMax) return false;
    if (f.nota_min && (r.provider.ratingCount === 0 || r.provider.ratingSum / r.provider.ratingCount < f.nota_min)) return false;
    return true;
  });

  // Disponibilidade: dia escolhido, ou próximos 7 dias para ordenar.
  const dates = f.data ? [f.data] : Array.from({ length: 7 }, (_, i) => addDays(utcToLocalDate(at), i));
  const slotCounts = await countSlotsForProviders(results.map((r) => ({ id: r.provider.id, durationMinutes: r.minDuration })), dates);
  for (const r of results) r.freeSlots = Object.values(slotCounts.get(r.provider.id) ?? {}).reduce((a, b) => a + b, 0);
  if (f.data) results = results.filter((r) => r.freeSlots > 0);

  const avg = (r: SearchResult) => (r.provider.ratingCount ? r.provider.ratingSum / r.provider.ratingCount : 0);
  const established = (r: SearchResult) => (r.provider.ratingCount >= MIN_REVIEWS_FOR_AVERAGE ? 1 : 0);
  const sort = f.ordenar ?? "relevancia";
  results.sort((a, b) => {
    switch (sort) {
      case "preco":
        return a.fromCents - b.fromCents;
      case "nota":
        return established(b) - established(a) || avg(b) - avg(a) || b.provider.ratingCount - a.provider.ratingCount;
      case "disponibilidade":
        return b.freeSlots - a.freeSlots;
      default: {
        // Relevância: nota ponderada pelo volume (média bayesiana simples) + disponibilidade como desempate.
        const score = (r: SearchResult) => (avg(r) * r.provider.ratingCount + 4 * 3) / (r.provider.ratingCount + 3);
        return score(b) - score(a) || b.freeSlots - a.freeSlots || a.fromCents - b.fromCents;
      }
    }
  });

  return {
    filters: f,
    results: results.slice(0, 50).map((r) => ({ provider: r.provider, fromCents: r.fromCents, freeSlots: r.freeSlots, services: r.services.sort((x, y) => x.fromCents - y.fromCents) })),
  };
}
