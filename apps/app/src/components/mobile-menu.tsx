"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { SidebarNav, type NavGroup } from "@/components/sidebar-nav";

/** Celular: botão de menu na barra superior que abre o menu lateral por cima da tela. */
export function MobileMenu({
  groups,
  userName,
  userInitials,
  roleLabel,
}: {
  groups: NavGroup[];
  userName: string;
  userInitials: string;
  roleLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Fecha o menu ao navegar para outra tela.
  useEffect(() => setOpen(false), [pathname]);

  // Trava a rolagem da página enquanto o menu está aberto.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
        className="mr-auto inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink transition-colors hover:bg-surface-alt md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* O cabeçalho usa backdrop-blur, que prende elementos fixos dentro dele: o painel vai direto para o body. */}
      {open &&
        mounted &&
        createPortal(
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-surface shadow-xl">
            <div className="flex items-center justify-between px-4 pb-1 pt-4">
              {/* No tema escuro a logo (texto navy) ganha um cartão branco para continuar legível. */}
              <div className="flex h-12 items-center rounded-xl px-3 dark:bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-terceirizei.png" alt="Terceirizei" className="h-9 w-auto" />
              </div>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface-alt"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav groups={groups} />
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-surface-alt/50 px-2 py-2">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand-orange text-xs font-bold text-white">{userInitials}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{userName}</p>
                  <p className="truncate text-[11px] text-muted">{roleLabel}</p>
                </div>
                <form action="/logout" method="post">
                  <button
                    type="submit"
                    title="Sair"
                    aria-label="Sair"
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
