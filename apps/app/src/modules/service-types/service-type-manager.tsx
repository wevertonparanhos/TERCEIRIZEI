"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { copyServiceTypes, deleteServiceType, saveServiceType, setServiceTypeActive, type ActionResult } from "@/modules/service-types/actions";

export type ServiceTypeItem = {
  id: string;
  name: string;
  workspaceId: string;
  active: boolean;
  taskCount: number;
};

export type WorkspaceOption = { id: string; name: string };

/** Tipos de solicitação divididos por área de trabalho: uma aba por área, cada uma com os seus tipos. */
export function ServiceTypeManager({ items, workspaces, initialWorkspaceId }: { items: ServiceTypeItem[]; workspaces: WorkspaceOption[]; initialWorkspaceId: string }) {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const current = workspaces.find((w) => w.id === workspaceId) ?? workspaces[0];
  const countByWorkspace = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) map.set(i.workspaceId, (map.get(i.workspaceId) ?? 0) + 1);
    return map;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => i.workspaceId === current?.id && (showInactive || i.active) && (!q || i.name.toLowerCase().includes(q)));
  }, [items, current, query, showInactive]);

  async function run<T extends object>(key: string, fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T> | null> {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      router.refresh();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
      return null;
    } finally {
      setBusy(null);
    }
  }

  function switchWorkspace(id: string) {
    setWorkspaceId(id);
    setEditing(null);
    setConfirmDelete(null);
    setCopying(false);
    setError(null);
    setNotice(null);
  }

  async function create() {
    if (!newName.trim() || !current) return;
    if (await run("new", () => saveServiceType(null, newName, current.id))) setNewName("");
  }

  async function rename() {
    if (!editing || !current) return;
    if (await run(editing.id, () => saveServiceType(editing.id, editing.name, current.id))) setEditing(null);
  }

  async function copy() {
    if (!copyFrom || !current) return;
    const result = await run("copy", () => copyServiceTypes(copyFrom, current.id));
    if (result && result.ok) {
      setCopying(false);
      setCopyFrom("");
      setNotice(result.created > 0 ? `${result.created} tipo(s) copiado(s) para ${current.name}.` : "Nada a copiar: esta área já tem todos os tipos da outra.");
    }
  }

  if (!current) return <p className="text-sm text-muted">Nenhuma área de trabalho cadastrada.</p>;
  const otherWorkspaces = workspaces.filter((w) => w.id !== current.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Áreas de trabalho">
        {workspaces.map((w) => (
          <button
            key={w.id}
            type="button"
            role="tab"
            aria-selected={w.id === current.id}
            onClick={() => switchWorkspace(w.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              w.id === current.id ? "bg-accent text-white" : "bg-surface-alt text-muted hover:text-ink"
            }`}
          >
            {w.name}
            <span className={`rounded-full px-1.5 text-[11px] ${w.id === current.id ? "bg-white/20 text-white" : "bg-surface text-muted-soft"}`}>{countByWorkspace.get(w.id) ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tipo" aria-label="Buscar tipo" className="h-10 w-64 max-w-full" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Mostrar desativados
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {otherWorkspaces.length > 0 && (
            <Button type="button" variant="outline" onClick={() => setCopying((v) => !v)} disabled={busy !== null}>
              <Copy className="mr-1.5 h-4 w-4" />
              Copiar de outra área
            </Button>
          )}
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              create();
            }}
          >
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`Novo tipo em ${current.name}`} aria-label="Novo tipo de solicitação" className="h-10 w-64 max-w-full" />
            <Button type="submit" disabled={busy !== null || !newName.trim()}>
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar
            </Button>
          </form>
        </div>
      </div>

      {copying && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-alt/60 px-4 py-3">
          <p className="text-sm text-ink">
            Copiar os tipos de outra área para <b>{current.name}</b>:
          </p>
          <Select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)} aria-label="Área de origem" className="h-9 max-w-[240px]">
            <option value="">Escolha a área...</option>
            {otherWorkspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({countByWorkspace.get(w.id) ?? 0})
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" onClick={copy} disabled={!copyFrom || busy !== null}>
            {busy === "copy" ? "Copiando..." : "Copiar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setCopying(false)}>
            Cancelar
          </Button>
          <p className="w-full text-xs text-muted">Os tipos que já existem aqui com o mesmo nome não são repetidos, e as tarefas da outra área não mudam.</p>
        </div>
      )}

      {notice && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">{notice}</p>}
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Tipo de solicitação — {current.name}</th>
              <th className="px-4 py-3 font-medium">Tarefas</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted-soft">
                  Nenhum tipo nesta área. Crie um acima ou copie de outra área.
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
