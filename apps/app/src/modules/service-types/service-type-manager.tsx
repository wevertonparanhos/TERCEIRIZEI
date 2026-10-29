"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { parseBrl } from "@/modules/processes/process-fields";
import { PRIORITY_LABELS } from "@/modules/processes/labels";
import { deleteServiceType, saveServiceType, setServiceTypeActive, type ActionResult } from "@/modules/service-types/actions";

export type ServiceTypeItem = {
  id: string;
  name: string;
  defaultPrice: number | null;
  defaultDeadlineDays: number | null;
  defaultPriority: string | null;
  defaultNotes: string;
  active: boolean;
  checklist: string[];
  taskCount: number;
};

type Draft = {
  id: string | null;
  name: string;
  price: string;
  days: string;
  priority: string;
  notes: string;
  active: boolean;
  checklist: string[];
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toDraft(item: ServiceTypeItem | null): Draft {
  return {
    id: item?.id ?? null,
    name: item?.name ?? "",
    price: item?.defaultPrice != null ? item.defaultPrice.toFixed(2).replace(".", ",") : "",
    days: item?.defaultDeadlineDays != null ? String(item.defaultDeadlineDays) : "",
    priority: item?.defaultPriority ?? "",
    notes: item?.defaultNotes ?? "",
    active: item?.active ?? true,
    checklist: item?.checklist ?? [],
  };
}

export function ServiceTypeManager({ items }: { items: ServiceTypeItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newItem, setNewItem] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (showInactive || i.active) && (!q || i.name.toLowerCase().includes(q)));
  }, [items, query, showInactive]);

  async function run(key: string, fn: () => Promise<ActionResult>) {
    setBusy(key);
    setError(null);
    try {
      const result = await fn();
      if (!result.ok) setError(result.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(null);
    }
  }

  function addChecklistItems(text: string) {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
      .filter(Boolean);
    if (lines.length === 0 || !draft) return;
    setDraft({ ...draft, checklist: [...draft.checklist, ...lines] });
    setNewItem("");
  }

  async function save() {
    if (!draft) return;
    setFormError(null);
    const price = draft.price.trim() === "" ? null : parseBrl(draft.price);
    if (draft.price.trim() !== "" && price === null) {
      setFormError("Valor inválido. Use números, por exemplo 250,00.");
      return;
    }
    const days = draft.days.trim() === "" ? null : Number(draft.days);
    if (days !== null && (!Number.isInteger(days) || days < 0)) {
      setFormError("O prazo deve ser um número inteiro de dias.");
      return;
    }
    setBusy("save");
    try {
      const result = await saveServiceType(draft.id, {
        name: draft.name,
        defaultPrice: price,
        defaultDeadlineDays: days,
        defaultPriority: (draft.priority || null) as never,
        defaultNotes: draft.notes,
        active: draft.active,
        checklist: draft.checklist.map((label) => ({ label })),
      });
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setDraft(null);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar modelo" aria-label="Buscar modelo" className="h-10 w-64 max-w-full" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Mostrar desativados
          </label>
        </div>
        <Button
          type="button"
          onClick={() => {
            setDraft(toDraft(null));
            setFormError(null);
            setNewItem("");
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Novo modelo
        </Button>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Prazo</th>
              <th className="px-4 py-3 font-medium">Prioridade</th>
              <th className="px-4 py-3 font-medium">Checklist</th>
              <th className="px-4 py-3 font-medium">Tarefas</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-soft">
                  Nenhum modelo encontrado.
                </td>
              </tr>
            )}
            {shown.map((item) => (
              <tr key={item.id} className={`border-b border-border last:border-0 hover:bg-surface-alt ${item.active ? "" : "opacity-60"}`}>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(toDraft(item));
                      setFormError(null);
                      setNewItem("");
                    }}
                    className="text-left font-medium text-ink hover:underline"
                  >
                    {item.name}
                  </button>
                  {!item.active && (
                    <span className="ml-2 align-middle">
                      <Badge variant="neutral">Desativado</Badge>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-muted">{item.defaultPrice != null ? brl.format(item.defaultPrice) : "—"}</td>
                <td className="px-4 py-3 text-muted">{item.defaultDeadlineDays != null ? `${item.defaultDeadlineDays} dia(s)` : "—"}</td>
                <td className="px-4 py-3 text-muted">{item.defaultPriority ? PRIORITY_LABELS[item.defaultPriority as keyof typeof PRIORITY_LABELS] ?? item.defaultPriority : "—"}</td>
                <td className="px-4 py-3 text-muted">{item.checklist.length > 0 ? `${item.checklist.length} item(ns)` : "—"}</td>
                <td className="px-4 py-3 text-muted">{item.taskCount}</td>
                <td className="px-4 py-3">
                  {confirmDelete === item.id ? (
                    <div className="flex items-center justify-end gap-2 text-xs">
                      <span className="text-muted">Excluir de vez?</span>
                      <Button type="button" size="sm" variant="outline" disabled={busy !== null} onClick={() => run(item.id, async () => { setConfirmDelete(null); return deleteServiceType(item.id); })}>
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
                          setDraft(toDraft(item));
                          setFormError(null);
                          setNewItem("");
                        }}
                      >
                        Editar
                      </button>
                      <button type="button" disabled={busy !== null} className="font-medium text-muted hover:underline" onClick={() => run(item.id, () => setServiceTypeActive(item.id, !item.active))}>
                        {item.active ? "Desativar" : "Ativar"}
                      </button>
                      <button type="button" className="font-medium text-red-500 hover:underline" onClick={() => { setConfirmDelete(item.id); setError(null); }}>
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

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        size="lg"
        title={draft?.id ? "Editar modelo" : "Novo modelo"}
        description="Os valores padrão preenchem a Nova Tarefa. O checklist é copiado para cada tarefa nova."
        footer={
          <>
            <span className="text-xs text-red-600">{formError}</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDraft(null)} disabled={busy === "save"}>
                Cancelar
              </Button>
              <Button type="button" onClick={save} disabled={busy === "save" || (draft?.name.trim().length ?? 0) < 2}>
                {busy === "save" ? "Salvando..." : "Salvar modelo"}
              </Button>
            </div>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="st-name">Nome do modelo</Label>
              <Input id="st-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Alteração contratual" autoFocus />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="st-price">Valor padrão (R$)</Label>
                <Input id="st-price" inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0,00" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-days">Prazo padrão (dias)</Label>
                <Input id="st-days" inputMode="numeric" value={draft.days} onChange={(e) => setDraft({ ...draft, days: e.target.value })} placeholder="Sem prazo" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="st-priority">Prioridade padrão</Label>
                <Select id="st-priority" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
                  <option value="">Nenhuma</option>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="st-notes">Anotações padrão</Label>
              <Textarea id="st-notes" rows={4} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Texto que já entra nas Anotações da tarefa (documentos necessários, orientações…)" />
            </div>

            <div className="space-y-2">
              <Label>Checklist padrão</Label>
              {draft.checklist.length === 0 && <p className="text-xs text-muted-soft">Nenhum item. Adicione abaixo, ou cole vários itens de uma vez (um por linha).</p>}
              <ul className="space-y-1.5">
                {draft.checklist.map((label, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <Input
                      aria-label={`Item ${i + 1} do checklist`}
                      value={label}
                      onChange={(e) => setDraft({ ...draft, checklist: draft.checklist.map((l, j) => (j === i ? e.target.value : l)) })}
                      className="h-9 flex-1"
                    />
                    <button
                      type="button"
                      aria-label="Subir"
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...draft.checklist];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setDraft({ ...draft, checklist: next });
                      }}
                      className="rounded p-1.5 text-muted hover:bg-surface-alt disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Descer"
                      disabled={i === draft.checklist.length - 1}
                      onClick={() => {
                        const next = [...draft.checklist];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        setDraft({ ...draft, checklist: next });
                      }}
                      className="rounded p-1.5 text-muted hover:bg-surface-alt disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Remover item" onClick={() => setDraft({ ...draft, checklist: draft.checklist.filter((_, j) => j !== i) })} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-2">
                <Textarea
                  aria-label="Novo item do checklist"
                  rows={2}
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addChecklistItems(newItem);
                    }
                  }}
                  placeholder="Novo item (Enter adiciona; cole várias linhas para adicionar vários)"
                  className="min-h-0 flex-1"
                />
                <Button type="button" size="sm" variant="outline" onClick={() => addChecklistItems(newItem)} disabled={!newItem.trim()}>
                  Adicionar
                </Button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
              Ativo (aparece na Nova Tarefa)
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
