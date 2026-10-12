/**
 * Avaliações estilo Airbnb/Uber: nota geral obrigatória, notas por critério
 * opcionais, elogios rápidos (ou pontos de melhoria, se a nota for baixa) e
 * comentário. O profissional pode responder publicamente uma vez.
 * Constantes usadas no navegador ficam em ./review-options (sem Zod).
 */
import { z } from "zod";
import type { BookingStatus } from "./booking-state";
import {
  CRITERIA,
  MIN_REVIEWS_FOR_AVERAGE,
  PRAISE_TAGS,
  REVIEW_WINDOW_DAYS,
  TAG_LABEL,
  tagsForRating,
  type CriterionKey,
} from "./review-options";

export * from "./review-options";

const star = z.coerce.number().int().min(1, "Escolha de 1 a 5 estrelas.").max(5, "Escolha de 1 a 5 estrelas.");
const optionalStar = z
  .union([z.literal(""), star])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

export const reviewInputSchema = z
  .object({
    rating: star,
    punctualityRating: optionalStar,
    qualityRating: optionalStar,
    communicationRating: optionalStar,
    careRating: optionalStar,
    valueRating: optionalStar,
    tags: z.array(z.string()).max(8, "Escolha no máximo 8 opções.").default([]),
    comment: z.string().trim().max(1000, "Máximo de 1000 caracteres.").default(""),
  })
  .superRefine((v, ctx) => {
    const allowed = tagsForRating(v.rating);
    for (const tag of v.tags) {
      if (!(tag in allowed)) ctx.addIssue({ code: "custom", path: ["tags"], message: "Opção inválida para esta nota." });
    }
    if (v.rating <= 2 && v.comment.length < 10) {
      ctx.addIssue({ code: "custom", path: ["comment"], message: "Conte o que aconteceu (mínimo de 10 caracteres)." });
    }
  })
  .transform((v) => ({ ...v, tags: [...new Set(v.tags)], comment: v.comment || null }));

export type ReviewInput = z.infer<typeof reviewInputSchema>;

export const providerReplySchema = z.object({
  reply: z.string().trim().min(5, "Escreva ao menos 5 caracteres.").max(600, "Máximo de 600 caracteres."),
});

export type ReviewEligibility = { ok: true } | { ok: false; reason: string };

/** Regra de quem pode avaliar (o banco repete a checagem no INSERT). */
export function canReview(params: {
  booking: { status: BookingStatus; customerId: string; providerId: string | null; completedAt: Date | null };
  userId: string;
  alreadyReviewed: boolean;
  now?: Date;
}): ReviewEligibility {
  const { booking, userId, alreadyReviewed } = params;
  const now = params.now ?? new Date();
  if (booking.customerId !== userId) return { ok: false, reason: "Só o cliente do pedido pode avaliar." };
  if (!booking.providerId) return { ok: false, reason: "Pedido sem profissional atribuído." };
  if (booking.status !== "COMPLETED" || !booking.completedAt) return { ok: false, reason: "A avaliação fica disponível após a conclusão do serviço." };
  if (alreadyReviewed) return { ok: false, reason: "Este pedido já foi avaliado." };
  const deadline = booking.completedAt.getTime() + REVIEW_WINDOW_DAYS * 86_400_000;
  if (now.getTime() > deadline) return { ok: false, reason: `O prazo de ${REVIEW_WINDOW_DAYS} dias para avaliar terminou.` };
  return { ok: true };
}

type ReviewLike = { rating: number; tags: string[] } & Partial<Record<CriterionKey, number | null>>;

export type RatingSummary = {
  count: number;
  /** Média com 1 casa decimal (ex.: 4.8) ou null se não houver avaliações. */
  average: number | null;
  /** true quando há poucas avaliações para exibir média (mostrar "Novo"). */
  isNew: boolean;
  /** Quantidade por estrela, de 5 a 1. */
  distribution: { stars: number; count: number }[];
  criteria: { key: CriterionKey; label: string; average: number | null }[];
  /** Elogios mais citados. */
  topTags: { tag: string; label: string; count: number }[];
};

const round1 = (sum: number, n: number) => Math.round((sum / n) * 10) / 10;

export function summarizeReviews(reviews: ReviewLike[]): RatingSummary {
  const count = reviews.length;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  const tagCounts = new Map<string, number>();
  for (const r of reviews) for (const t of r.tags) if (t in PRAISE_TAGS) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);

  return {
    count,
    average: count ? round1(sum, count) : null,
    isNew: count < MIN_REVIEWS_FOR_AVERAGE,
    distribution: [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length })),
    criteria: CRITERIA.map(({ key, label }) => {
      const values = reviews.map((r) => r[key]).filter((v): v is number => typeof v === "number");
      return { key, label, average: values.length ? round1(values.reduce((a, b) => a + b, 0), values.length) : null };
    }),
    topTags: [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 4)
      .map(([tag, n]) => ({ tag, label: TAG_LABEL[tag] ?? tag, count: n })),
  };
}

/** "4.8" → "4,8" */
export function formatRating(value: number): string {
  return value.toFixed(1).replace(".", ",");
}

/** Nome público do avaliador: "Maria Souza Lima" → "Maria L." (minimização de dados). */
export function publicReviewerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Cliente";
  const first = parts[0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]! : "";
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}
