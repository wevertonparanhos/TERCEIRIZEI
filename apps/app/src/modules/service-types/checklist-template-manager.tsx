"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { groupChecklistItems } from "@/lib/checklist-grouping";

type TemplateItem = { id: string; label: string; category: string | null };

export function ChecklistTemplateManager({
  serviceTypeId,
  items,
  addItem,
  removeItem,
  moveItem,
}: {
  serviceTypeId: string;
  items: TemplateItem[];
  addItem: (serviceTypeId: string, input: { label: string; category?: string }) => Promise<void>;
  removeItem: (serviceTypeId: string, itemId: string) => Promise<void>;
  moveItem: (serviceTypeId: string, itemId: string, direction: "up" | "down") => Promise<void>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<void>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(formData: FormData) {
    const label = (formData.get("label") as string) ?? "";
    const category = (formData.get("category") as string) ?? "";
    const ok = await run(() => addItem(serviceTypeId, { label, category }));
    if (ok) formRef.current?.reset();
  }

  const groups = groupChecklistItems(items);
  const showGroupHeaders = groups.length > 1 || (groups.length === 1 && groups[0].category !== null);

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">Checklist padrão</h3>
      <p className="mt-1 text-xs text-muted">
        Copiado automaticamente para cada novo processo deste tipo de serviço — depois pode ser editado livremente
        em cada processo.
      </p>

      {items.length === 0 && <p className="mt-3 text-sm text-muted-soft">Nenhum item no checklist padrão.</p>}

      {items.length > 0 && (
        <div className="mt-3 space-y-3">
          {groups.map((group) => (
            <div key={group.category ?? "\0uncategorized"}>
              {showGroupHeaders && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-soft">
                  {group.category ?? "Outros"}
                </p>
              )}
              <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
                {group.items.map((item) => {
                  const index = items.findIndex((i) => i.id === item.id);
                  return (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="flex-1 text-sm text-ink">{item.label}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={busy || index === 0}
                          onClick={() => run(() => moveItem(serviceTypeId, item.id, "up"))}
                          className="rounded px-2 py-1 text-xs text-muted hover:bg-surface-alt disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={busy || index === items.length - 1}
                          onClick={() => run(() => moveItem(serviceTypeId, item.id, "down"))}
                          className="rounded px-2 py-1 text-xs text-muted hover:bg-surface-alt disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(() => removeItem(serviceTypeId, item.id))}
                          className="rounded px-2 py-1 text-xs text-red-500 hover:bg-surface-alt"
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} action={handleAdd} className="mt-4 flex gap-2">
        <Input name="label" placeholder="Novo item do checklist padrão" className="flex-1" />
        <Input name="category" placeholder="Categoria (opcional)" className="w-40" />
        <Button type="submit" size="sm" disabled={busy}>
          + Adicionar
        </Button>
      </form>

      {error && <p className="mt-3 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
