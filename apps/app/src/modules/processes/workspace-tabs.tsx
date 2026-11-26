"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

type WorkspaceTab = { id: string; name: string; archived?: boolean };
type Result = { ok: true } | { ok: false; error: string };

export function WorkspaceTabs({
  workspaces,
  activeId,
  basePath,
  createWorkspace,
  manage,
  options,
}: {
  workspaces: WorkspaceTab[];
  activeId: string;
  basePath: string;
  createWorkspace: (name: string) => Promise<{ id: string }>;
  /** Só nas telas de gestão (Etapas do Kanban) — renomear e mover a área ativa. */
  manage?: {
    renameWorkspace: (workspaceId: string, name: string) => Promise<void>;
    moveWorkspace: (workspaceId: string, direction: "up" | "down") => Promise<void>;
  };
  /** Administrador/gestor: arquivar, restaurar e excluir áreas (botão ⋯ ao lado das abas). */
  options?: {
    archived: { id: string; name: string }[];
    setArchived: (workspaceId: string, archived: boolean) => Promise<Result>;
    deleteWorkspace: (workspaceId: string) => Promise<Result>;
  };
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeIndex = workspaces.findIndex((w) => w.id === activeId);
  const activeWorkspace = workspaces[activeIndex];
  const activeCount = workspaces.filter((w) => !w.archived).length;

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

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

  /** Ações que devolvem { ok, error }: mostra o motivo quando não dá. */
  async function runResult(fn: () => Promise<Result>, after?: () => void): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      after?.();
      router.refresh();
      return true;
    } catch {
      setError("Não foi possível concluir a ação. Tente de novo.");
      return false;
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

  function archive(id: string) {
    if (!options) return;
    setMenuOpen(false);
    // Arquivou a área aberta: volta para a primeira área ativa.
    void runResult(() => options.setArchived(id, true), () => id === activeId && router.push(basePath));
  }

  function restore(id: string) {
    if (!options) return;
    setMenuOpen(false);
    void runResult(() => options.setArchived(id, false), () => router.push(`${basePath}?area=${id}`));
  }

  async function doDelete() {
    if (!options || !confirmDelete) return;
    setDeleteError(null);
    setBusy(true);
    try {
      const result = await options.deleteWorkspace(confirmDelete.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      const wasActive = confirmDelete.id === activeId;
      setConfirmDelete(null);
      if (wasActive) router.push(basePath);
      router.refresh();
    } catch {
      setDeleteError("Não foi possível excluir a área. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const menuItem = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-alt disabled:opacity-40";

  return (
    <div>
      <div className="flex items-center gap-1 border-b border-border pb-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden">
          {workspaces.map((w) => (
            <Link
              key={w.id}
              href={`${basePath}?area=${w.id}`}
              className={cn(
                "flex flex-none items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                w.id === activeId ? "bg-brand-blue text-white shadow-sm" : "text-muted hover:bg-surface-alt hover:text-ink",
                w.archived && w.id !== activeId && "italic opacity-70"
              )}
            >
              {w.archived && <Archive className="h-3.5 w-3.5" />}
              {w.name}
            </Link>
          ))}
          {creating ? (
            <form action={handleCreate} className="flex items-center gap-1 px-2 py-1.5">
              <input name="name" autoFocus placeholder="Nome da área" className="h-7 rounded-md border border-border-strong bg-surface px-2 text-xs text-ink" />
              <button type="submit" disabled={busy} className="text-xs font-medium text-accent hover:underline">
                Criar
              </button>
              <button type="button" onClick={() => setCreating(false)} className="text-xs text-muted hover:text-ink">
                Cancelar
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setCreating(true)} className="flex-none whitespace-nowrap px-3 py-2 text-sm text-muted hover:text-accent">
              + Área
            </button>
          )}
        </div>

        {options && activeWorkspace && (
          <div ref={menuRef} className="relative flex-none">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Opções das áreas de trabalho"
              title="Arquivar, excluir ou restaurar áreas"
              onClick={() => setMenuOpen((o) => !o)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink"
            >
              <MoreHorizontal className="h-5 w-5" />
              {options.archived.length > 0 && (
                <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-muted-soft" aria-hidden />
              )}
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-30 mt-1.5 w-80 overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-xl">
                <p className="truncate px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-soft">Área aberta: {activeWorkspace.name}</p>
                {activeWorkspace.archived ? (
                  <button type="button" role="menuitem" disabled={busy} onClick={() => restore(activeWorkspace.id)} className={cn(menuItem, "text-ink")}>
                    <ArchiveRestore className="h-4 w-4 text-muted" /> Restaurar esta área
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy || activeCount <= 1}
                    title={activeCount <= 1 ? "Precisa ficar pelo menos uma área ativa" : undefined}
                    onClick={() => archive(activeWorkspace.id)}
                    className={cn(menuItem, "text-ink")}
                  >
                    <Archive className="h-4 w-4 text-muted" />
                    <span>
                      Arquivar esta área
                      <span className="block text-[11px] text-muted">Sai das abas e da Nova Tarefa; as tarefas continuam no financeiro e na busca</span>
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteError(null);
                    setConfirmDelete({ id: activeWorkspace.id, name: activeWorkspace.name });
                  }}
                  className={cn(menuItem, "text-red-600 dark:text-red-400")}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>
                    Excluir esta área
                    <span className="block text-[11px] text-muted">Só para área vazia, sem tarefas</span>
                  </span>
                </button>

                <div className="my-1.5 border-t border-border" />
                <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-soft">Áreas arquivadas ({options.archived.length})</p>
                {options.archived.length === 0 ? (
                  <p className="px-3 pb-2 text-xs text-muted-soft">Nenhuma área arquivada.</p>
                ) : (
                  <ul className="max-h-56 overflow-y-auto">
                    {options.archived.map((a) => (
                      <li key={a.id} className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-surface-alt">
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{a.name}</span>
                        <Link
                          href={`${basePath}?area=${a.id}`}
                          onClick={() => setMenuOpen(false)}
                          title="Ver as tarefas"
                          aria-label={`Ver ${a.name}`}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-ink"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => restore(a.id)}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-accent hover:bg-surface disabled:opacity-40"
                        >
                          Restaurar
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {activeWorkspace?.archived && options && (
        <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Archive className="h-4 w-4 flex-none" />
          <span className="flex-1">Esta área está arquivada: não aparece nas abas nem na Nova Tarefa.</span>
          <button type="button" disabled={busy} onClick={() => restore(activeWorkspace.id)} className="font-semibold underline disabled:opacity-50">
            Restaurar área
          </button>
        </div>
      )}

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
              <input name="name" autoFocus defaultValue={activeWorkspace.name} className="h-7 rounded-md border border-border-strong bg-surface px-2 text-xs text-ink" />
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
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <Modal
        open={!!confirmDelete}
        onClose={() => !busy && setConfirmDelete(null)}
        title="Excluir área de trabalho"
        description={confirmDelete ? `“${confirmDelete.name}” será apagada de vez, com as etapas e etiquetas dela.` : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={doDelete} className="bg-red-600 hover:bg-red-700">
              {busy ? "Excluindo…" : "Excluir de vez"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-muted">
          <p>Isso não pode ser desfeito. Só dá para excluir uma área vazia: se ela tem tarefas (mesmo arquivadas), o sistema não deixa.</p>
          <p>
            Se a ideia é só tirar a área do caminho, use <b className="text-ink">Arquivar</b>: dá para restaurar depois e nada se perde.
          </p>
          {deleteError && <p className="rounded-md bg-red-50 px-3 py-2 text-red-700 dark:bg-red-500/10 dark:text-red-400">{deleteError}</p>}
        </div>
      </Modal>
    </div>
  );
}
