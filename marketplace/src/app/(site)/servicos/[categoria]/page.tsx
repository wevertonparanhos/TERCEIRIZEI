import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { Badge, EmptyState } from "@/components/ui/surface";
import { formatBRL } from "@/domain/money";
import { getCategoryWithServices } from "@/server/catalog";

const MODEL_LABEL = { FIXED: "Preço fixo", CALCULATED: "Preço calculado", QUOTE: "Sob orçamento" } as const;

type Props = { params: Promise<{ categoria: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategoryWithServices((await params).categoria);
  return { title: category?.name ?? "Categoria" };
}

export default async function CategoryPage({ params }: Props) {
  const category = await getCategoryWithServices((await params).categoria);
  if (!category) notFound();

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted" aria-label="Trilha">
        <Link href="/servicos" className="hover:text-ink">Serviços</Link>
        <ChevronRight className="size-4" aria-hidden />
        <span className="text-ink">{category.name}</span>
      </nav>

      <div className="mb-8 flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand text-brand-ink">
          <CategoryIcon name={category.icon} className="size-6" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
          {category.description ? <p className="mt-1 text-muted">{category.description}</p> : null}
          {category.requiresQualification ? (
            <Badge tone="brand" className="mt-3">
              <BadgeCheck className="size-3.5" aria-hidden /> Profissionais com qualificação verificada
            </Badge>
          ) : null}
        </div>
      </div>

      {category.services.length === 0 ? (
        <EmptyState title="Nenhum serviço publicado nesta categoria" description="Estamos preparando os pacotes. Volte em breve." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {category.services.map((s) => (
            <li key={s.id}>
              <Link
                href={`/servico/${s.slug}`}
                className="group flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)] transition hover:border-brand/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{s.name}</h2>
                  <Badge tone={s.pricingModel === "QUOTE" ? "highlight" : "neutral"}>{MODEL_LABEL[s.pricingModel]}</Badge>
                </div>
                {s.summary ? <p className="mt-2 text-sm text-muted">{s.summary}</p> : null}
                <div className="mt-auto flex items-end justify-between pt-6">
                  <div className="text-sm">
                    {s.pricingModel === "QUOTE" ? (
                      <span className="text-muted">Proposta antes de qualquer cobrança</span>
                    ) : s.fromCents !== null ? (
                      <>
                        <span className="text-muted">a partir de </span>
                        <span className="text-lg font-bold text-ink">{formatBRL(s.fromCents)}</span>
                      </>
                    ) : (
                      <span className="text-muted">Aguardando profissionais na sua região</span>
                    )}
                    {s.providerCount > 0 ? (
                      <p className="mt-0.5 text-xs text-muted">
                        {s.providerCount} {s.providerCount === 1 ? "profissional" : "profissionais"}
                      </p>
                    ) : null}
                  </div>
                  <ArrowRight className="size-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
