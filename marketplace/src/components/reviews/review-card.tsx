import type { ReactNode } from "react";
import { TAG_LABEL } from "@/domain/reviews";
import { Stars } from "./stars";

const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

type Props = {
  reviewer: string;
  serviceName?: string;
  rating: number;
  tags: string[];
  comment: string | null;
  createdAt: Date;
  providerName?: string;
  providerReply: string | null;
  providerRepliedAt: Date | null;
  footer?: ReactNode;
};

export function ReviewCard(r: Props) {
  return (
    <article className="space-y-3">
      <header className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white" aria-hidden>
          {r.reviewer.charAt(0)}
        </span>
        <div>
          <p className="font-semibold">{r.reviewer}</p>
          <p className="text-xs text-muted">
            {monthYear.format(r.createdAt)}
            {r.serviceName ? ` · ${r.serviceName}` : ""}
          </p>
        </div>
      </header>
      <Stars value={r.rating} size="sm" />
      {r.comment ? <p className="whitespace-pre-line leading-relaxed text-ink-soft">{r.comment}</p> : null}
      {r.tags.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <li key={t} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft">{TAG_LABEL[t] ?? t}</li>
          ))}
        </ul>
      ) : null}
      {r.providerReply ? (
        <div className="ml-4 border-l-2 border-brand/30 pl-4">
          <p className="text-xs font-semibold text-ink">
            Resposta {r.providerName ? `de ${r.providerName}` : "do profissional"}
            {r.providerRepliedAt ? <span className="font-normal text-muted"> · {monthYear.format(r.providerRepliedAt)}</span> : null}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{r.providerReply}</p>
        </div>
      ) : null}
      {r.footer}
    </article>
  );
}
