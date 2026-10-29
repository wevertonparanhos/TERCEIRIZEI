"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAllPortalVisibility, setProcessPortalVisibility } from "@/modules/portal/actions";

export type VisibilityItem = {
  id: string;
  number: number;
  title: string;
  service: string;
  stage: string;
  visible: boolean;
  requestedByClient: boolean;
  archived: boolean;
};

export function PortalVisibilityList({ clientId, items: initial }: { clientId: string; items: VisibilityItem[] }) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleCount = items.filter((i) => i.visible).length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => `${i.number} ${i.title} ${i.service} ${i.stage}`.toLowerCase().includes(q)) : items;
  }, [items, query]);

  async function toggle(item: VisibilityItem) {
    setBusy(item.id);
    setError(null);
    const next = !item.visible;
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, visible: next } : i)));
    try {
      await setProcessPortalVisibility(clientId, item.id, next);
    } catch (err) {
      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, visible: item.visible } : i)));
      setError(err instanceof Error ? err.message : "Não foi possível alterar.");
    } finally {
      setBusy(null);
    }
  }

  async function setAll(visible: boolean) {
    setBusy("all");
    setError(null);
    const before = items;
    setItems((list) => list.map((i) => ({ ...i, visible })));
    try {
      await setAllPortalVisibility(clientId, visible);
    } catch (err) {
      setItems(before);
      setError(err instanceof Error ? err.message : "Não foi possível alterar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">Visíveis {visibleCount}</span>
          <span className="rounded-full bg-surface-alt px-2.5 py-1 font-semibold text-muted">Ocultas {items.length - visibleCount}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={busy !== null || visibleCount === items.length} onClick={() => setAll(true)}>
            Mostrar todas
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy !== null || visibleCount === 0} onClick={() => setAll(false)}>
            Ocultar todas
          </Button>
        </div>
      </div>

      <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tarefa deste cliente" aria-label="Buscar tarefa deste cliente" className="max-w-sm" />

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {shown.length === 0 && <li className="px-4 py-6 text-center text-sm text-muted-soft">{items.length === 0 ? "Este cliente ainda não tem tarefas." : "Nenhuma tarefa encontrada."}</li>}
        {shown.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                <span className="mr-1.5 font-mono text-xs text-muted-soft">#{item.number}</span>
                {item.title}
              </p>
              <p className="truncate text-xs text-muted">
                {item.service} · {item.stage}
                {item.requestedByClient ? " · pedida pelo cliente" : ""}
                {item.archived ? " · arquivada" : ""}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={item.visible}
              aria-label={item.visible ? "Ocultar do portal" : "Mostrar no portal"}
              disabled={busy !== null}
              onClick={() => toggle(item)}
              className={`relative h-6 w-11 flex-none rounded-full transition-colors disabled:opacity-60 ${item.visible ? "bg-accent" : "bg-border-strong"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${item.visible ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
