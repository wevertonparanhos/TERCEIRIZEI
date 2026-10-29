"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Layers, ListChecks, Settings2, Tags } from "lucide-react";

type Item = { href: string; label: string; hint: string; icon: "etapas" | "modelos" | "tipos" };

const ICONS = { etapas: Layers, modelos: ListChecks, tipos: Tags } as const;

/** Menu "Gerenciar" do cabeçalho da Área de Trabalho: reúne as telas de configuração (etapas, modelos e tipos). */
export function ManageMenu({ items, className = "", iconOnly = false }: { items: Item[]; className?: string; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        aria-label="Gerenciar etapas, modelos e tipos"
        title="Gerenciar etapas, modelos e tipos"
        className={`inline-flex h-10 items-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${iconOnly ? "w-10 justify-center" : "px-3.5"} ${className}`}
      >
        <Settings2 className="h-4 w-4" />
        {!iconOnly && "Gerenciar"}
        {!iconOnly && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-alt"
              >
                <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{item.label}</span>
                  <span className="block text-xs text-muted">{item.hint}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
