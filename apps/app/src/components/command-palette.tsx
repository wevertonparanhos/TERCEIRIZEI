"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Building2, ClipboardList, CornerDownLeft, Handshake, Loader2, Plus, Search } from "lucide-react";
import { matchesSearch } from "@/modules/processes/search";
import { parseSearchQuery } from "@/modules/command/query";
import type { CommandHit, CommandSearchResult } from "@/modules/command/actions";

export type CommandLink = { href: string; label: string };

type Entry = { key: string; href: string; title: string; subtitle?: string; group: string; icon: React.ReactNode };

/** Busca geral do sistema: Ctrl K (ou Cmd K) em qualquer tela. Acha tarefas, clientes e empresas, leva às telas e às ações de criar. */
export function CommandPalette({
  links,
  createActions,
  search,
}: {
  links: CommandLink[];
  createActions: CommandLink[];
  search: (query: string) => Promise<CommandSearchResult>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<CommandHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => setMounted(true), []);

  // Ctrl K / Cmd K abre e fecha de qualquer tela.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // Limpa ao fechar (e não ao abrir), para não apagar o que for digitado logo depois do Ctrl K.
  useEffect(() => {
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      inputRef.current?.focus();
      return () => {
        document.body.style.overflow = previous;
      };
    }
    setQuery("");
    setHits([]);
    setError(null);
    setActive(0);
  }, [open]);

  // Busca no servidor com uma pequena espera entre as teclas; respostas antigas são descartadas.
  useEffect(() => {
    if (!open) return;
    const id = ++seq.current;
    if (!parseSearchQuery(query)) {
      setHits([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const result = await search(query);
        if (id !== seq.current) return;
        if (result.ok) {
          setHits(result.hits);
          setError(null);
        } else {
          setHits([]);
          setError(result.error);
        }
      } catch {
        if (id === seq.current) setError("A busca falhou. Tente de novo.");
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, open, search]);

  const entries = useMemo<Entry[]>(() => {
    const q = query.trim();
    const create = createActions
      .filter((a) => !q || matchesSearch([a.label, "criar novo nova"], q))
      .map((a) => ({ key: `criar:${a.href}`, href: a.href, title: a.label, group: "Criar", icon: <Plus className="h-4 w-4" /> }));
    const nav = links
      .filter((l) => !q || matchesSearch([l.label], q))
      .slice(0, q ? 4 : links.length)
      .map((l) => ({ key: `ir:${l.href}`, href: l.href, title: l.label, group: "Ir para", icon: <ArrowRight className="h-4 w-4" /> }));
    // Clientes e empresas primeiro: são poucos e levam direto ao cadastro; as tarefas vêm logo abaixo.
    const order = { cliente: 0, empresa: 1, tarefa: 2 } as const;
    const found = [...hits].sort((a, b) => order[a.kind] - order[b.kind]).map((h) => ({
      key: `${h.kind}:${h.id}`,
      href: h.href,
      title: h.title,
      subtitle: h.subtitle,
      group: h.kind === "tarefa" ? "Tarefas" : h.kind === "cliente" ? "Clientes" : "Empresas",
      icon:
        h.kind === "tarefa" ? <ClipboardList className="h-4 w-4" /> : h.kind === "cliente" ? <Handshake className="h-4 w-4" /> : <Building2 className="h-4 w-4" />,
    }));
    return q ? [...found, ...create, ...nav] : [...create, ...nav];
  }, [query, hits, links, createActions]);

  useEffect(() => setActive(0), [entries.length, query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(entry: Entry | undefined) {
    if (!entry) return;
    setOpen(false);
    router.push(entry.href);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(entries.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(entries[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  const showHint = !parseSearchQuery(query) && query.trim().length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-md items-center gap-2.5 rounded-xl border border-border bg-surface px-3 text-left text-sm text-muted-soft transition-colors hover:border-border-strong hover:text-muted md:inline-flex"
      >
        <Search className="h-4 w-4 flex-none" />
        <span className="flex-1 truncate">Buscar tarefa, cliente ou ação…</span>
        <kbd className="flex-none rounded-md border border-border px-1.5 py-0.5 font-sans text-[11px] text-muted">Ctrl K</kbd>
      </button>
      <button
        type="button"
        aria-label="Buscar"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink md:hidden"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>

      {/* O cabeçalho usa backdrop-blur, que prende elementos fixos dentro dele: a janela vai direto para o body. */}
      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 pt-[10vh] sm:p-6 sm:pt-[12vh]" role="dialog" aria-modal="true" aria-label="Busca geral">
            <button type="button" aria-label="Fechar busca" className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <div className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border px-4">
                {loading ? <Loader2 className="h-4 w-4 flex-none animate-spin text-muted" /> : <Search className="h-4 w-4 flex-none text-muted" />}
                <input
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKey}
                  placeholder="Nº da tarefa, nome, cliente, CNPJ ou o que quer fazer…"
                  aria-label="Buscar"
                  aria-controls="busca-geral-lista"
                  aria-activedescendant={entries[active] ? `busca-${active}` : undefined}
                  className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-soft"
                />
                <kbd className="flex-none rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
              </div>

              <div ref={listRef} id="busca-geral-lista" role="listbox" className="flex-1 overflow-y-auto p-2">
                {error && <p className="m-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
                {showHint && <p className="px-3 py-2 text-xs text-muted-soft">Digite pelo menos 2 letras ou o número da tarefa.</p>}
                {entries.length === 0 && !loading && !showHint && (
                  <p className="px-3 py-8 text-center text-sm text-muted-soft">Nada encontrado para “{query.trim()}”.</p>
                )}
                {entries.map((entry, index) => {
                  const firstOfGroup = index === 0 || entries[index - 1].group !== entry.group;
                  const selected = index === active;
                  return (
                    <div key={entry.key}>
                      {firstOfGroup && (
                        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-soft first:pt-1">{entry.group}</p>
                      )}
                      <button
                        type="button"
                        id={`busca-${index}`}
                        role="option"
                        aria-selected={selected}
                        data-index={index}
                        onMouseMove={() => setActive(index)}
                        onClick={() => go(entry)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${selected ? "bg-accent-soft" : ""}`}
                      >
                        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${selected ? "bg-accent text-white" : "bg-surface-alt text-muted"}`}>
                          {entry.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{entry.title}</span>
                          {entry.subtitle && <span className="block truncate text-xs text-muted">{entry.subtitle}</span>}
                        </span>
                        {selected && <CornerDownLeft className="h-4 w-4 flex-none text-muted" />}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-soft">
                <span>↑ ↓ para escolher</span>
                <span>Enter para abrir</span>
                <span className="ml-auto">Ctrl K abre de qualquer tela</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
