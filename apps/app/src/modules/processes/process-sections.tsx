"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ProcessSection = {
  key: string;
  label: string;
  content: ReactNode;
  badge?: boolean;
  icon?: ReactNode;
  /** conteúdo que já vem em cartões próprios (sem a moldura da seção) */
  bare?: boolean;
};

/** Tarefa numa página só: as partes uma embaixo da outra, com um índice que acompanha a rolagem.
 * ?tab=chave na URL (links antigos, "Copiar link", menções) rola direto para a parte. */
export function ProcessSections({ sections, initialKey }: { sections: ProcessSection[]; initialKey?: string }) {
  const [active, setActive] = useState(sections.some((s) => s.key === initialKey) ? (initialKey as string) : sections[0]?.key);
  const clickedAt = useRef(0);

  // Abre já na parte pedida no link.
  useEffect(() => {
    if (!initialKey || initialKey === sections[0]?.key) return;
    // Espera o Next terminar de posicionar a página (ele volta ao topo ao abrir) e rola para a parte pedida.
    const jump = () => document.getElementById(`secao-${initialKey}`)?.scrollIntoView({ block: "start" });
    const timers = [setTimeout(jump, 120), setTimeout(jump, 600)];
    return () => timers.forEach(clearTimeout);
    // só na primeira abertura
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O índice marca a parte que está no alto da tela.
  useEffect(() => {
    const els = sections.map((s) => document.getElementById(`secao-${s.key}`)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() - clickedAt.current < 800) return; // durante a rolagem do clique, fica a parte escolhida
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id.replace("secao-", ""));
      },
      { rootMargin: "-120px 0px -55% 0px" }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  function go(key: string) {
    clickedAt.current = Date.now();
    setActive(key);
    const el = document.getElementById(`secao-${key}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    // Se a rolagem suave não acontecer (aba em segundo plano, navegador sem animação), pula direto.
    setTimeout(() => {
      if (el && Math.abs(el.getBoundingClientRect().top) > 160) el.scrollIntoView({ block: "start" });
    }, 700);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", key);
    window.history.replaceState(null, "", url.toString());
  }

  const navItem = (s: ProcessSection, compact: boolean) => (
    <button
      key={s.key}
      type="button"
      onClick={() => go(s.key)}
      aria-current={s.key === active ? "true" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg text-sm font-medium transition-colors",
        compact ? "flex-none px-3 py-1.5" : "w-full px-3 py-2 text-left",
        s.key === active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface-alt hover:text-ink"
      )}
    >
      <span className="flex-none">{s.icon}</span>
      <span className={compact ? "" : "flex-1 truncate"}>{s.label}</span>
      {s.badge && <span className="h-1.5 w-1.5 flex-none rounded-full bg-brand-orange" aria-label="tem novidade" />}
    </button>
  );

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[10.5rem_minmax(0,1fr)]">
      {/* Telas largas: índice fixo à esquerda. Telas menores: faixa de atalhos que acompanha a rolagem. */}
      <nav aria-label="Partes da tarefa" className="sticky top-16 z-10 hidden self-start xl:block">
        <div className="space-y-0.5">{sections.map((s) => navItem(s, false))}</div>
      </nav>
      <nav
        aria-label="Partes da tarefa"
        className="sticky top-14 z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-border/70 bg-surface/95 p-1 shadow-sm backdrop-blur [scrollbar-width:none] xl:hidden [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((s) => navItem(s, true))}
      </nav>

      <div className="min-w-0 space-y-4">
        {sections.map((s) => (
          <section key={s.key} id={`secao-${s.key}`} aria-label={s.label} className="scroll-mt-28 xl:scroll-mt-20">
            {s.bare ? (
              <div className="space-y-3">
                <h2 className="flex items-center gap-2 px-1 font-display text-base font-bold text-ink">
                  <span className="text-muted-soft">{s.icon}</span>
                  {s.label}
                </h2>
                {s.content}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink">
                  <span className="text-muted-soft">{s.icon}</span>
                  {s.label}
                  {s.badge && <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />}
                </h2>
                {s.content}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
