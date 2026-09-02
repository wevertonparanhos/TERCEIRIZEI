"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Item = { id: string; description: string; value: string };

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProposalItems({
  proposalId,
  items,
  canWrite,
  addItem,
  removeItem,
}: {
  proposalId: string;
  items: Item[];
  canWrite: boolean;
  addItem: (proposalId: string, data: { description: string; value: number }) => Promise<void>;
  removeItem: (proposalId: string, itemId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + Number(item.value), 0);

  async function action(formData: FormData) {
    const description = (formData.get("description") as string) ?? "";
    const value = Number(formData.get("value"));
    setSubmitting(true);
    setError(null);
    try {
      await addItem(proposalId, { description, value });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(itemId: string) {
    await removeItem(proposalId, itemId);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Itens</h3>
        <span className="font-mono text-base font-semibold text-ink">{currencyFormatter.format(total)}</span>
      </div>

      {items.length === 0 && <p className="mt-3 text-sm text-muted-soft">Nenhum item adicionado.</p>}

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 text-sm text-ink">{item.description}</span>
              <span className="font-mono text-sm text-muted">{currencyFormatter.format(Number(item.value))}</span>
              {canWrite && (
                <button type="button" onClick={() => handleRemove(item.id)} className="text-xs text-red-500 hover:underline">
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form action={action} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4 print:hidden">
          <div className="flex-1 min-w-[180px]">
            <Input name="description" placeholder="Descrição do item" required />
          </div>
          <div className="w-32">
            <Input name="value" type="number" step="0.01" min="0" placeholder="Valor" required />
          </div>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Salvando..." : "Adicionar"}
          </Button>
        </form>
      )}
      {error && <p className="mt-2 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
