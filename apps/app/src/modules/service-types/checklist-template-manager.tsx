"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TemplateItem = { id: string; label: string };

export function ChecklistTemplateManager({
  serviceTypeId,
  items,
  addItem,
  removeItem,
  moveItem,
}: {
  serviceTypeId: string;
  items: TemplateItem[];
  addItem: (serviceTypeId: string, input: { label: string }) => Promise<void>;
  removeItem: (serviceTypeId: string, itemId: string) => Promise<void>;
  moveItem: (serviceTypeId: string, itemId: string, direction: "up" | "down") => Promise<void>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleAdd(formData: FormData) {
    const label = (formData.get("label") as string) ?? "";
    await run(() => addItem(serviceTypeId, { label }));
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-brand-navy">Checklist padrão</h3>
      <p className="mt-1 text-xs text-slate-500">
        Copiado automaticamente para cada novo processo deste tipo de serviço — depois pode ser editado livremente
        em cada processo.
      </p>

      {items.length === 0 && <p className="mt-3 text-sm text-slate-400">Nenhum item no checklist padrão.</p>}

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 text-sm text-slate-700">{item.label}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => run(() => moveItem(serviceTypeId, item.id, "up"))}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={busy || index === items.length - 1}
                  onClick={() => run(() => moveItem(serviceTypeId, item.id, "down"))}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => removeItem(serviceTypeId, item.id))}
                  className="rounded px-2 py-1 text-xs text-red-500 hover:bg-slate-100"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form action={handleAdd} className="mt-4 flex gap-2">
        <Input name="label" placeholder="Novo item do checklist padrão" className="flex-1" />
        <Button type="submit" size="sm" disabled={busy}>
          + Adicionar
        </Button>
      </form>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
