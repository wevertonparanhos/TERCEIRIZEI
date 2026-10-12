import { RatingSummaryPanel } from "@/components/reviews/rating-summary";
import { ReviewCard } from "@/components/reviews/review-card";
import { LinkButton } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/surface";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { getProviderRatingSummary, getPublicReviews } from "@/server/reviews";
import { ReplyForm } from "./reply-form";

export default async function ProviderReviewsPage() {
  const user = await requirePageRole(["PROVIDER"], "/profissional/avaliacoes");
  const provider = await db.providerProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true, displayName: true, status: true } });
  const [summary, reviews] = await Promise.all([getProviderRatingSummary(provider.id), getPublicReviews(provider.id, 100)]);

  return (
    <>
      <PageHeader
        title="Minhas avaliações"
        description="O que os clientes dizem sobre o seu trabalho. Você pode responder cada avaliação uma vez."
        actions={provider.status === "APPROVED" ? <LinkButton href={`/profissionais/${provider.id}`} variant="secondary">Ver perfil público</LinkButton> : undefined}
      />
      <Card className="p-6">
        <RatingSummaryPanel summary={summary} />
      </Card>

      {reviews.length > 0 ? (
        <Card className="mt-6 divide-y divide-line">
          {reviews.map((r) => (
            <div key={r.id} className="p-6">
              <ReviewCard
                {...r}
                providerName="você"
                footer={r.providerReply ? null : <ReplyForm reviewId={r.id} />}
              />
            </div>
          ))}
        </Card>
      ) : null}
    </>
  );
}
