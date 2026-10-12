import { describe, expect, it } from "vitest";
import {
  canReview,
  formatRating,
  providerReplySchema,
  publicReviewerName,
  reviewInputSchema,
  summarizeReviews,
  tagsForRating,
} from "./reviews";

const completedAt = new Date("2026-10-01T15:00:00Z");
const booking = { status: "COMPLETED" as const, customerId: "c1", providerId: "p1", completedAt };

describe("quem pode avaliar", () => {
  it("cliente do pedido concluído, dentro do prazo, uma única vez", () => {
    expect(canReview({ booking, userId: "c1", alreadyReviewed: false, now: new Date("2026-10-05") }).ok).toBe(true);
  });

  it("bloqueia outro usuário, pedido não concluído, avaliação repetida e prazo vencido", () => {
    expect(canReview({ booking, userId: "outro", alreadyReviewed: false, now: completedAt }).ok).toBe(false);
    expect(canReview({ booking: { ...booking, status: "CONFIRMED" }, userId: "c1", alreadyReviewed: false, now: completedAt }).ok).toBe(false);
    expect(canReview({ booking: { ...booking, status: "IN_PROGRESS" }, userId: "c1", alreadyReviewed: false, now: completedAt }).ok).toBe(false);
    expect(canReview({ booking, userId: "c1", alreadyReviewed: true, now: completedAt }).ok).toBe(false);
    expect(canReview({ booking, userId: "c1", alreadyReviewed: false, now: new Date("2026-10-16T15:00:01Z") }).ok).toBe(false);
    expect(canReview({ booking: { ...booking, providerId: null }, userId: "c1", alreadyReviewed: false, now: completedAt }).ok).toBe(false);
  });
});

describe("validação do formulário de avaliação", () => {
  it("aceita nota 5 com elogios e critérios opcionais", () => {
    const r = reviewInputSchema.parse({ rating: "5", qualityRating: "5", punctualityRating: "", tags: ["pontual", "pontual", "caprichoso"], comment: "  Ótimo!  " });
    expect(r.rating).toBe(5);
    expect(r.qualityRating).toBe(5);
    expect(r.punctualityRating).toBeNull();
    expect(r.tags).toEqual(["pontual", "caprichoso"]);
    expect(r.comment).toBe("Ótimo!");
  });

  it("nota baixa exige comentário e só aceita pontos de melhoria", () => {
    expect(reviewInputSchema.safeParse({ rating: 1, tags: [], comment: "ruim" }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 2, tags: ["pontual"], comment: "Não limpou a cozinha." }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 2, tags: ["incompleto"], comment: "Não limpou a cozinha." }).success).toBe(true);
  });

  it("rejeita nota fora de 1–5, tag inventada e comentário longo", () => {
    expect(reviewInputSchema.safeParse({ rating: 0 }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 6 }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 5, tags: ["<script>"] }).success).toBe(false);
    expect(reviewInputSchema.safeParse({ rating: 5, comment: "x".repeat(1001) }).success).toBe(false);
  });

  it("mostra elogios para 4–5 e melhorias para 1–3", () => {
    expect(Object.keys(tagsForRating(5))).toContain("pontual");
    expect(Object.keys(tagsForRating(3))).toContain("atraso");
  });

  it("valida a resposta do profissional", () => {
    expect(providerReplySchema.safeParse({ reply: "Obrigado!" }).success).toBe(true);
    expect(providerReplySchema.safeParse({ reply: "ok" }).success).toBe(false);
  });
});

describe("resumo das avaliações", () => {
  it("calcula média, distribuição, critérios e elogios mais citados", () => {
    const s = summarizeReviews([
      { rating: 5, tags: ["pontual", "caprichoso"], qualityRating: 5, punctualityRating: 5 },
      { rating: 5, tags: ["pontual"], qualityRating: 4 },
      { rating: 4, tags: ["educado"], qualityRating: null },
      { rating: 2, tags: ["atraso"], punctualityRating: 1 },
    ]);
    expect(s.count).toBe(4);
    expect(s.average).toBe(4); // 16/4
    expect(s.isNew).toBe(false);
    expect(s.distribution).toEqual([
      { stars: 5, count: 2 },
      { stars: 4, count: 1 },
      { stars: 3, count: 0 },
      { stars: 2, count: 1 },
      { stars: 1, count: 0 },
    ]);
    expect(s.criteria.find((c) => c.key === "qualityRating")?.average).toBe(4.5);
    expect(s.criteria.find((c) => c.key === "punctualityRating")?.average).toBe(3);
    expect(s.criteria.find((c) => c.key === "valueRating")?.average).toBeNull();
    expect(s.topTags[0]).toEqual({ tag: "pontual", label: "Pontual", count: 2 });
    expect(s.topTags.some((t) => t.tag === "atraso")).toBe(false); // melhorias não viram "destaque"
  });

  it("arredonda para 1 casa e marca perfil com poucas avaliações como Novo", () => {
    const s = summarizeReviews([{ rating: 5, tags: [] }, { rating: 4, tags: [] }]);
    expect(s.average).toBe(4.5);
    expect(s.isNew).toBe(true);
    expect(summarizeReviews([{ rating: 5, tags: [] }, { rating: 5, tags: [] }, { rating: 4, tags: [] }]).average).toBe(4.7);
    expect(summarizeReviews([]).average).toBeNull();
  });

  it("formata nota e protege o nome do avaliador", () => {
    expect(formatRating(4.8)).toBe("4,8");
    expect(formatRating(5)).toBe("5,0");
    expect(publicReviewerName("Maria Souza Lima")).toBe("Maria L.");
    expect(publicReviewerName("João")).toBe("João");
    expect(publicReviewerName("  ")).toBe("Cliente");
  });
});
