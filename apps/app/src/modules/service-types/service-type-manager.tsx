"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteServiceType, saveServiceType, setServiceTypeActive, type ActionResult } from "@/modules/service-types/actions";

export type ServiceTypeItem = {
  id: string;
  name: string;
  active: boolean;
  taskCount: number;
};

export function ServiceTypeManager({ items }: { items: ServiceTypeItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (showInactive || i.active) && (!q || i.name.toLowerCase().includes(q)));
  }, [items, query, showInactive]);

  async function run(key: string, fn: () => Promise<ActionResult>): Promise<boolean> {
    setBusy(key);
    setError(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    if (!newName.trim()) return;
    if (await run("new", () => saveServiceType(null, newName))) setNewName("");
  }

  async function rename() {
    if (!editing) return;
    if (await run(editing.id, () => saveServiceType(editing.id, editing.name))) setEditing(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tipo" aria-label="Buscar tipo" className="h-10 w-64 max-w-full" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Mostrar desativados
          </label>
        </div>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Novo tipo de solicitação" aria-label="Novo tipo de solicitação" className="h-10 w-64 max-w-full" />
          <Button type="submit" disabled={busy !== null || !newName.trim()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Adicionar
          </Button>
        </form>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Tipo de solicitação</th>
              <th className="px-4 py-3 font-medium">Tarefas</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted-soft">
                  Nenhum tipo encontrado.
                </td>
              </tr>
            )}
            {shown.map((item) => (
              <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-surface-alt ${item.active ? "" : "opacity-60"}`}>
                <td className="px-4 py-3">
                  {editing?.id === item.id ? (
                    <form
                      className="flex items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        rename();
                      }}
                    >
                      <Input value={editing.name} onChange={(e) => setEditing({ id: item.id, name: e.target.value })} aria-label="Nome do tipo" className="h-9 max-w-xs" autoFocus />
                      <Button type="submit" size="sm" disabled={busy !== null}>
                        Salvar
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        Cancelar
                      </Button>
                    </form>
                  ) : (
                    <>
                      <span className="font-medium text-ink">{item.name}</span>
                      {!item.active && (
                        <span className="ml-2 align-middle">
                          <Badge variant="neutral">Desativado</Badge>
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{item.taskCount}</td>
                <td className="px-4 py-3">
                  {confirmDelete === item.id ? (
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <span className="text-muted">Excluir o tipo?</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy !== null}
                        onClick={() =>
                          run(item.id, async () => {
                            setConfirmDelete(null);
                            return deleteServiceType(item.id);
                          })
                        }
                      >
                        Sim
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                        Não
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-3 text-xs">
                      <button
                        type="button"
                        className="font-medium text-accent hover:underline"
                        onClick={() => {
                          setEditing({ id: item.id, name: item.name });
                          setError(null);
                        }}
                      >
                        Renomear
                      </button>
                      <button type="button" disabled={busy !== null} className="font-medium text-muted hover:underline" onClick={() => run(item.id, () => setServiceTypeActive(item.id, !item.active))}>
                        {item.active ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className="font-medium text-red-500 hover:underline"
                        onClick={() => {
                          setConfirmDelete(item.id);
                          setError(null);
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
