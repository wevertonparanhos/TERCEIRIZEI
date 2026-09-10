"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type WorkspaceTab = { id: string; name: string };

export function WorkspaceTabs({
  workspaces,
  activeId,
  basePath,
  createWorkspace,
  manage,
}: {
  workspaces: WorkspaceTab[];
  activeId: string;
  basePath: string;
  createWorkspace: (name: string) => Promise<{ id: string }>;
  /** Só passar nas telas de gestão (Etapas do Kanban) — habilita renomear/mover/excluir a área ativa. */
  manage?: {
    renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
    deleteWorkspace: (workspaceId: string) => Promise<void>;
    moveWorkspace: (workspaceId: string, direction: "up" | "down") => Promise<void>;
  };
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeIndex = workspaces.findIndex((w) => w.id === activeId);
  const activeWorkspace = workspaces[activeIndex];

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(formData: FormData) {
    const name = (formData.get("name") as string) ?? "";
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { id } = await createWorkspace(name);
      setCreating(false);
      router.push(`${basePath}?area=${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a área.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(formData: FormData) {
    const name = (formData.get("name") as string) ?? "";
    if (!name.trim() || !manage) return;
    await run(() => manage.renameWorkspace(activeId, name));
    setRenaming(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {workspaces.map((w) => (
          <Link
            key={w.id}
            href={`${basePath}?area=${w.id}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              w.id === activeId ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            )}
          >
            {w.name}
          </Link>
        ))}
        {creating ? (
          <form action={handleCreate} className="flex items-center gap-1 px-2 py-1.5">
            <input
              name="name"
              autoFocus
              placeholder="Nome da área"
              className="h-7 rounded-md border border-border-strong bg-surface px-2 text-xs text-ink"
            />
            <button type="submit" disabled={busy} className="text-xs font-medium text-accent hover:underline">
              Criar
            </button>
            <button type="button" onClick={() => setCreating(false)} className="text-xs text-muted hover:text-ink">
              Cancelar
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setCreating(true)} className="px-3 py-2 text-sm text-muted hover:text-accent">
            + Área
          </button>
        )}
      </div>

      {manage && activeWorkspace && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <button
            type="button"
            disabled={busy || activeIndex === 0}
            onClick={() => run(() => manage.moveWorkspace(activeId, "up"))}
            className="rounded px-1.5 py-1 text-muted hover:bg-surface-alt disabled:opacity-30"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={busy || activeIndex === workspaces.length - 1}
            onClick={() => run(() => manage.moveWorkspace(activeId, "down"))}
            className="rounded px-1.5 py-1 text-muted hover:bg-surface-alt disabled:opacity-30"
          >
            ↓
          </button>

          {renaming ? (
            <form action={handleRename} className="flex items-center gap-2">
              <input
                name="name"
                autoFocus
                defaultValue={activeWorkspace.name}
                className="h-7 rounded-md border border-border-strong bg-surface px-2 text-xs text-ink"
              />
              <button type="submit" disabled={busy} className="font-medium text-accent hover:underline">
                Salvar
              </button>
              <button type="button" onClick={() => setRenaming(false)} className="text-muted hover:text-ink">
                Cancelar
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setRenaming(true)} className="font-medium text-accent hover:underline">
              Renomear área
            </button>
          )}

          {workspaces.length > 1 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => manage.deleteWorkspace(activeId))}
              className="font-medium text-red-500 hover:underline"
            >
              Excluir área
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
