import "server-only";
import { MIN_REVIEWS_FOR_AVERAGE, publicReviewerName, summarizeReviews } from "@/domain/reviews";
import { LIVE_OFFER } from "./catalog";
import { db } from "./db";

const PUBLIC_REVIEW_SELECT = {
  id: true,
  rating: true,
  punctualityRating: true,
  qualityRating: true,
  communicationRating: true,
  careRating: true,
  valueRating: true,
  tags: true,
  comment: true,
  providerReply: true,
  providerRepliedAt: true,
  createdAt: true,
  customer: { select: { name: true } },
  booking: { select: { service: { select: { name: true } } } },
} as const;

/** Avaliações públicas: só PUBLICADAS, com nome do cliente minimizado ("Maria L."). */
export async function getPublicReviews(providerId: string, take = 50) {
  const rows = await db.review.findMany({
    where: { providerId, status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take,
    select: PUBLIC_REVIEW_SELECT,
  });
  return rows.map(({ customer, booking, ...r }) => ({
    ...r,
    reviewer: publicReviewerName(customer.name),
    serviceName: booking.service.name,
  }));
}

export type PublicReview = Awaited<ReturnType<typeof getPublicReviews>>[number];

export async function getProviderRatingSummary(providerId: string) {
  const rows = await db.review.findMany({
    where: { providerId, status: "PUBLISHED" },
    select: {
      rating: true,
      tags: true,
      punctualityRating: true,
      qualityRating: true,
      communicationRating: true,
      careRating: true,
      valueRating: true,
    },
  });
  return summarizeReviews(rows);
}

/** Perfil público: só profissionais APROVADOS e ativos; sem telefone, e-mail ou endereço. */
export async function getPublicProviderProfile(providerId: string) {
  const provider = await db.providerProfile.findFirst({
    where: { id: providerId, status: "APPROVED", user: { status: "ACTIVE" } },
    select: {
      id: true,
      displayName: true,
      bio: true,
      photoUrl: true,
      baseCity: true,
      baseState: true,
      experienceYears: true,
      qualifications: true,
      approvedAt: true,
      createdAt: true,
      user: { select: { isDemo: true } },
      categories: { select: { category: { select: { name: true, slug: true } } } },
    },
  });
  if (!provider) return null;

  const [summary, reviews, completedJobs] = await Promise.all([
    getProviderRatingSummary(provider.id),
    getPublicReviews(provider.id),
    db.booking.count({ where: { providerId: provider.id, status: "COMPLETED" } }),
  ]);
  return { provider, summary, reviews, completedJobs };
}

/** Profissionais que oferecem um serviço, com nota e menor preço do profissional. */
export async function listProvidersForService(serviceId: string) {
  const offers = await db.providerOffer.findMany({
    where: { ...LIVE_OFFER, serviceId, addonId: null },
    select: {
      priceCents: true,
      provider: {
        select: {
          id: true,
          displayName: true,
          baseCity: true,
          baseState: true,
          experienceYears: true,
          ratingSum: true,
          ratingCount: true,
          user: { select: { isDemo: true } },
        },
      },
    },
  });

  const byProvider = new Map<string, { provider: (typeof offers)[number]["provider"]; minPriceCents: number }>();
  for (const o of offers) {
    const current = byProvider.get(o.provider.id);
    if (!current || o.priceCents < current.minPriceCents) byProvider.set(o.provider.id, { provider: o.provider, minPriceCents: o.priceCents });
  }

  // Perfis com média já exibida (≥ 3 avaliações) primeiro, por nota; depois os
  // "Novos". Desempate: mais avaliações, depois menor preço.
  const established = (p: { ratingCount: number }) => (p.ratingCount >= MIN_REVIEWS_FOR_AVERAGE ? 1 : 0);
  const avg = (p: { ratingSum: number; ratingCount: number }) => (p.ratingCount ? p.ratingSum / p.ratingCount : 0);
  return [...byProvider.values()].sort(
    (a, b) =>
      established(b.provider) - established(a.provider) ||
      avg(b.provider) - avg(a.provider) ||
      b.provider.ratingCount - a.provider.ratingCount ||
      a.minPriceCents - b.minPriceCents,
  );
}
