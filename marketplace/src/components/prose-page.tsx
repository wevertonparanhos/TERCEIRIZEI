import type { ReactNode } from "react";
import { Notice } from "./ui/surface";

export function ProsePage({ title, intro, draft, children }: { title: string; intro?: string; draft?: boolean; children: ReactNode }) {
  return (
    <article className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {intro ? <p className="mt-3 text-lg text-ink-soft">{intro}</p> : null}
      {draft ? (
        <div className="mt-6">
          <Notice tone="warning" title="Minuta para revisão jurídica">
            Este texto é um rascunho técnico e precisa ser revisado por um advogado antes da operação comercial.
          </Notice>
        </div>
      ) : null}
      <div className="mt-8 space-y-6 leading-relaxed text-ink-soft [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
