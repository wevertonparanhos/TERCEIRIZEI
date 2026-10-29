"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string };

/** Moldura do Portal do Cliente: menu lateral fixo no computador e, no celular,
 * barra superior com botão que abre o menu por cima da tela. */
export function PortalShell({
  navItems,
  userName,
  themeToggle,
  logout,
  accentRgb,
  accentSoftRgb,
  children,
}: {
  /** cor de destaque deste cliente ("R G B"); sem ela vale o azul da marca */
  accentRgb?: string | null;
  accentSoftRgb?: string | null;
  navItems: NavItem[];
  userName: string;
  themeToggle: ReactNode;
  logout: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Fecha o menu ao navegar.
  useEffect(() => setOpen(false), [pathname]);

  const nav = (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {navItems.map((item) => {
        const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-accent text-white shadow-sm" : "text-muted hover:bg-surface-alt hover:text-ink"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-border px-4 py-4">
      <p className="truncate text-sm font-medium text-ink">{userName}</p>
      <p className="text-xs text-muted">Cliente</p>
      <div className="mt-3">{logout}</div>
    </div>
  );

  const brand = (
    <div>
      <div className="flex h-11 items-center rounded-xl dark:bg-white dark:px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-terceirizei.png" alt="Terceirizei" className="h-8 w-auto" />
      </div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[1.5px] text-muted-soft">Portal do Cliente</p>
    </div>
  );

  return (
    <div
      className="flex min-h-screen bg-bg"
      style={accentRgb ? ({ "--color-accent": accentRgb, ...(accentSoftRgb ? { "--color-accent-soft": accentSoftRgb } : {}) } as React.CSSProperties) : undefined}
    >
      {/* Computador: menu fixo */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-none flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-4">
          {brand}
          {themeToggle}
        </div>
        {nav}
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Celular: barra superior */}
        <header className="sticky top-0 z-30 flex h-14 flex-none items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur md:hidden">
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-ink hover:bg-surface-alt"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-extrabold tracking-tight text-ink">Terceirizei OS</span>
          {themeToggle}
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>

      {/* Celular: menu por cima */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-4">
              {brand}
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-alt"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </div>
  );
}
