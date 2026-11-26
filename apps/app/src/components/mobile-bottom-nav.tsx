"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellRing, ClipboardList, DollarSign, Menu, Plus, Search, Sun, X } from "lucide-react";
import { OPEN_MOBILE_MENU_EVENT } from "@/components/mobile-menu";
import { OPEN_SEARCH_EVENT } from "@/components/command-palette";
import type { CreateAction } from "@/components/create-menu";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Celular: barra fixa embaixo com o que se usa o dia todo — Hoje, Quadro, Criar, Lembretes e o menu completo. */
export function MobileBottomNav({
  createActions,
  showReminders,
  reminderBadge,
}: {
  createActions: CreateAction[];
  /** financeiro não usa lembretes: no lugar entra o Financeiro */
  showReminders: boolean;
  reminderBadge: number;
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setSheetOpen(false), [pathname]);

  const item = (href: string, label: string, icon: React.ReactNode, badge?: number) => {
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-accent" : "text-muted"}`}
      >
        <span className="relative">
          {icon}
          {badge ? (
            <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
              {badge > 99 ? "99+" : badge}
            </span>
          ) : null}
        </span>
        {label}
      </Link>
    );
  };

  const openSearch = () => {
    setSheetOpen(false);
    window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
  };

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
        style={{ height: "calc(4rem + env(safe-area-inset-bottom))" }}
      >
        {item("/hoje", "Hoje", <Sun className="h-5 w-5" />)}
        {item("/processos", "Quadro", <ClipboardList className="h-5 w-5" />)}
        <div className="flex flex-1 items-start justify-center">
          <button
            type="button"
            aria-label={createActions.length > 0 ? "Criar ou buscar" : "Buscar"}
            aria-expanded={sheetOpen}
            onClick={() => (createActions.length > 0 ? setSheetOpen(true) : openSearch())}
            className="-mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-orange text-white shadow-[0_6px_16px_rgba(234,126,18,0.35)] active:scale-95"
          >
            {createActions.length > 0 ? <Plus className="h-6 w-6" strokeWidth={2.6} /> : <Search className="h-5 w-5" />}
          </button>
        </div>
        {showReminders
          ? item("/lembretes", "Lembretes", <BellRing className="h-5 w-5" />, reminderBadge)
          : item("/financeiro", "Financeiro", <DollarSign className="h-5 w-5" />)}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_MOBILE_MENU_EVENT))}
          className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-muted"
        >
          <Menu className="h-5 w-5" />
          Menu
        </button>
      </nav>

      {sheetOpen &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Criar">
            <button type="button" aria-label="Fechar" className="absolute inset-0 bg-black/40" onClick={() => setSheetOpen(false)} />
            <div className="absolute inset-x-0 bottom-0 space-y-1 rounded-t-3xl bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
              <div className="flex items-center justify-between pb-2">
                <h2 className="font-display text-base font-bold text-ink">Criar</h2>
                <button type="button" aria-label="Fechar" onClick={() => setSheetOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {createActions.map((a) => (
                <Link key={a.href} href={a.href} onClick={() => setSheetOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-3 active:bg-surface-alt">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-orange/15 text-brand-orange">
                    <Plus className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-ink">{a.label}</span>
                    <span className="block text-xs text-muted">{a.hint}</span>
                  </span>
                </Link>
              ))}
              <button type="button" onClick={openSearch} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left active:bg-surface-alt">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-surface-alt text-muted">
                  <Search className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-ink">Buscar</span>
                  <span className="block text-xs text-muted">Tarefa, cliente, empresa ou tela</span>
                </span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
