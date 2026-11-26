"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";

export type CreateAction = { href: string; label: string; hint: string };

/** Botão laranja "Criar" do menu lateral: um lugar só para nova tarefa, novo cliente e nova proposta. */
export function CreateMenu({ actions }: { actions: CreateAction[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (actions.length === 0) return null;

  // Uma ação só (ex.: financeiro só cria proposta): o botão vai direto para ela.
  if (actions.length === 1) {
    return (
      <Link
        href={actions[0].href}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-orange text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.6} /> {actions[0].label}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-orange text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.6} /> Criar
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex flex-col rounded-lg px-3 py-2 transition-colors hover:bg-surface-alt"
            >
              <span className="text-sm font-semibold text-ink">{a.label}</span>
              <span className="text-[11px] text-muted">{a.hint}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
