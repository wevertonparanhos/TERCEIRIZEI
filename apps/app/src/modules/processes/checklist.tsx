"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChecklistItem = { id: string; label: string; done: boolean };

export function Checklist({
  processId,
  items,
  canWrite,
  addItem,
  toggleItem,
  deleteItem,
}: {
  processId: string;
  items: ChecklistItem[];
  canWrite: boolean;
  addItem: (processId: string, label: string) => Promise<void>;
  toggleItem: (processId: string, itemId: string, done: boolean) => Promise<void>;
  deleteItem: (processId: string, itemId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    const label = (formData.get("label") as string) ?? "";
    setSubmitting(true);
    setError(null);
    try {
      await addItem(processId, label);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(itemId: string, done: boolean) {
    await toggleItem(processId, itemId, done);
    router.refresh();
  }

  async function handleDelete(itemId: string) {
    await deleteItem(processId, itemId);
    router.refresh();
  }

  const done = items.filter((i) => i.done).length;

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">
        Checklist {items.length > 0 && <span className="font-normal text-muted-soft">({done}/{items.length})</span>}
      </h3>

      {items.length === 0 && <p className="mt-3 text-sm text-muted-soft">Nenhum item no checklist.</p>}

      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={item.done}
                disabled={!canWrite}
                onChange={(e) => handleToggle(item.id, e.target.checked)}
                className="h-4 w-4 rounded border-border-strong text-ink focus:ring-accent"
              />
              <span className={`flex-1 text-sm ${item.done ? "text-muted-soft line-through" : "text-ink"}`}>
                {item.label}
              </span>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form action={action} className="mt-4 flex gap-2 border-t border-border pt-4">
          <Input name="label" placeholder="Novo item do checklist" className="flex-1" />
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Salvando..." : "Adicionar"}
          </Button>
        </form>
      )}
      {error && <p className="mt-2 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
