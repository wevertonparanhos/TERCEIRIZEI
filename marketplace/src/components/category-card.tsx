import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatBRL } from "@/domain/money";
import { CategoryIcon } from "./category-icon";

type Props = {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  fromCents: number | null;
};

export function CategoryCard({ slug, name, description, icon, fromCents }: Props) {
  return (
    <Link
      href={`/servicos/${slug}`}
      className="group flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-brand/40"
    >
      <span className="mb-4 grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand transition group-hover:bg-brand group-hover:text-brand-ink">
        <CategoryIcon name={icon} className="size-5" />
      </span>
      <span className="font-semibold text-ink">{name}</span>
      {description ? <span className="mt-1 line-clamp-2 text-sm text-muted">{description}</span> : null}
      <span className="mt-4 flex items-center justify-between text-sm">
        <span className={fromCents !== null ? "font-semibold text-ink" : "text-muted"}>
          {fromCents !== null ? `a partir de ${formatBRL(fromCents)}` : "Em breve na sua região"}
        </span>
        <ArrowRight className="size-4 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
      </span>
    </Link>
  );
}
