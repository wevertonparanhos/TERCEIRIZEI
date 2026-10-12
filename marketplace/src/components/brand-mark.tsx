import Link from "next/link";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Logotipo provisório (monograma + nome configurável). */
export function BrandMark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-bold tracking-tight text-ink", className)}>
      <span className="grid size-8 place-items-center rounded-xl bg-brand text-sm text-brand-ink" aria-hidden>
        {brand.name.charAt(0)}
      </span>
      <span className="text-lg">{brand.name}</span>
    </Link>
  );
}
