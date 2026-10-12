import { Star } from "lucide-react";
import { formatRating, type RatingSummary } from "@/domain/reviews";

/** Bloco de resumo no estilo Airbnb: média grande, distribuição por estrela e notas por critério. */
export function RatingSummaryPanel({ summary }: { summary: RatingSummary }) {
  if (summary.count === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-6 text-center">
        <p className="font-semibold">Ainda sem avaliações</p>
        <p className="mt-1 text-sm text-muted">As avaliações aparecem aqui depois dos primeiros serviços concluídos.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[13rem_1fr]">
      <div>
        <p className="flex items-center gap-2 text-5xl font-extrabold tracking-tight">
          <Star className="size-9 text-highlight" fill="currentColor" strokeWidth={0} aria-hidden />
          {summary.isNew ? "Novo" : formatRating(summary.average ?? 0)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {summary.count} {summary.count === 1 ? "avaliação" : "avaliações"}
          {summary.isNew ? " · média exibida a partir de 3" : ""}
        </p>
        <ul className="mt-4 space-y-1.5" aria-label="Distribuição das notas">
          {summary.distribution.map((d) => (
            <li key={d.stars} className="flex items-center gap-2 text-xs text-muted">
              <span className="w-3 text-right">{d.stars}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-ink" style={{ width: `${(d.count / summary.count) * 100}%` }} />
              </span>
              <span className="w-5 text-right">{d.count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
          {summary.criteria
            .filter((c) => c.average !== null)
            .map((c) => (
              <div key={c.key} className="border-l border-line pl-4">
                <dt className="text-sm text-muted">{c.label}</dt>
                <dd className="mt-0.5 text-lg font-bold">{formatRating(c.average ?? 0)}</dd>
              </div>
            ))}
        </dl>
        {summary.topTags.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-semibold">Mais elogiado por</p>
            <ul className="flex flex-wrap gap-2">
              {summary.topTags.map((t) => (
                <li key={t.tag} className="rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-strong">
                  {t.label} <span className="text-brand-strong/60">· {t.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
