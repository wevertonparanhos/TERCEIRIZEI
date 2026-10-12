import { Star } from "lucide-react";
import { MIN_REVIEWS_FOR_AVERAGE } from "@/domain/review-options";
import { formatRating } from "@/domain/reviews";
import { cn } from "@/lib/utils";

/** Estrelas somente leitura, com preenchimento parcial (ex.: 4,5). */
export function Stars({ value, size = "md", className }: { value: number; size?: "sm" | "md" | "lg"; className?: string }) {
  const px = { sm: "size-3.5", md: "size-4", lg: "size-6" }[size];
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${formatRating(value)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className={cn("relative inline-block", px)} aria-hidden>
            <Star className={cn("absolute inset-0 text-line-strong", px)} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className={cn("text-highlight", px)} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** Selo compacto "★ 4,8 (23)" ou "★ Novo" — usado em cartões e listas. */
export function RatingBadge({ sum, count, className }: { sum: number; count: number; className?: string }) {
  const isNew = count < MIN_REVIEWS_FOR_AVERAGE;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm font-semibold text-ink", className)}>
      <Star className="size-4 text-highlight" fill="currentColor" strokeWidth={0} aria-hidden />
      {isNew ? (
        <span>
          Novo{count > 0 ? <span className="font-normal text-muted"> · {count} {count === 1 ? "avaliação" : "avaliações"}</span> : null}
        </span>
      ) : (
        <span>
          {formatRating(sum / count)} <span className="font-normal text-muted">({count})</span>
        </span>
      )}
    </span>
  );
}
