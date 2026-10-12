import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Briefcase, MapPin } from "lucide-react";
import { RatingSummaryPanel } from "@/components/reviews/rating-summary";
import { ReviewCard } from "@/components/reviews/review-card";
import { Badge, Card, Notice } from "@/components/ui/surface";
import { formatRating } from "@/domain/reviews";
import { getPublicProviderProfile } from "@/server/reviews";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  return UUID.test(id) ? getPublicProviderProfile(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).id);
  return { title: data?.provider.displayName ?? "Profissional" };
}

export default async function ProviderPublicPage({ params }: Props) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { provider, summary, reviews, completedJobs } = data;
  const since = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(provider.approvedAt ?? provider.createdAt);

  return (
    <div className="container-page max-w-5xl py-10">
      {provider.user.isDemo ? (
        <div className="mb-6">
          <Notice tone="warning" title="Perfil de demonstração">Profissional e avaliações fictícios, criados para testar a plataforma.</Notice>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[20rem_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6 text-center">
            <span className="mx-auto grid size-24 place-items-center rounded-full bg-brand text-3xl font-bold text-brand-ink" aria-hidden>
              {provider.displayName.charAt(0)}
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">{provider.displayName}</h1>
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand">
              <BadgeCheck className="size-4" aria-hidden /> Perfil verificado
            </p>
            <dl className="mt-6 grid grid-cols-3 divide-x divide-line border-y border-line py-4">
              <div>
                <dt className="text-xs text-muted">Avaliações</dt>
                <dd className="text-lg font-bold">{summary.count}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Nota</dt>
                <dd className="text-lg font-bold">{summary.isNew ? "Novo" : `${formatRating(summary.average ?? 0)}★`}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Serviços</dt>
                <dd className="text-lg font-bold">{completedJobs}</dd>
              </div>
            </dl>
            <ul className="mt-4 space-y-2 text-left text-sm text-ink-soft">
              {provider.baseCity ? (
                <li className="flex items-center gap-2"><MapPin className="size-4 text-muted" aria-hidden /> {provider.baseCity}/{provider.baseState}</li>
              ) : null}
              {provider.experienceYears != null ? (
                <li className="flex items-center gap-2"><Briefcase className="size-4 text-muted" aria-hidden /> {provider.experienceYears} anos de experiência</li>
              ) : null}
              <li className="flex items-center gap-2"><BadgeCheck className="size-4 text-muted" aria-hidden /> Na plataforma desde {since}</li>
            </ul>
            <p className="mt-5 text-xs text-muted">Telefone e endereço são liberados somente após o pagamento confirmado de um pedido.</p>
          </Card>
        </aside>

        <div className="min-w-0 space-y-10">
          {provider.bio ? (
            <section>
              <h2 className="text-xl font-bold">Sobre</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{provider.bio}</p>
              {provider.qualifications ? (
                <p className="mt-3 text-sm text-muted"><span className="font-medium text-ink-soft">Qualificações:</span> {provider.qualifications}</p>
              ) : null}
            </section>
          ) : null}

          {provider.categories.length > 0 ? (
            <section>
              <h2 className="text-xl font-bold">Atende</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {provider.categories.map(({ category }) => (
                  <li key={category.slug}>
                    <Link href={`/servicos/${category.slug}`}><Badge tone="neutral" className="px-3 py-1 text-sm hover:bg-ink/10">{category.name}</Badge></Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="avaliacoes">
            <h2 id="avaliacoes" className="mb-5 text-xl font-bold">Avaliações</h2>
            <RatingSummaryPanel summary={summary} />
            {reviews.length > 0 ? (
              <div className="mt-10 grid gap-10 md:grid-cols-2">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} {...r} providerName={provider.displayName.split(" ")[0]} />
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
