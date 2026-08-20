"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type InvoiceItem = { id: string; description: string; amount: string; process: { number: number } | null };
type ProcessOption = { id: string; number: number; description: string };

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function InvoiceItems({
  invoiceId,
  items,
  processes,
  canWrite,
  addItem,
  removeItem,
}: {
  invoiceId: string;
  items: InvoiceItem[];
  processes: ProcessOption[];
  canWrite: boolean;
  addItem: (invoiceId: string, data: { description: string; amount: number; processId?: string }) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function action(formData: FormData) {
    const description = (formData.get("description") as string) ?? "";
    const amount = Number(formData.get("amount"));
    const processId = (formData.get("processId") as string) || undefined;
    setSubmitting(true);
    setError(null);
    try {
      await addItem(invoiceId, { description, amount, processId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(itemId: string) {
    await removeItem(itemId);
    router.refresh();
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-ink">Itens</h3>

      {items.length === 0 && <p className="mt-3 text-sm text-muted-soft">Nenhum item adicionado.</p>}

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2">
              <span className="flex-1 text-sm text-ink">
                {item.description}
                {item.process && <span className="ml-2 text-xs text-muted-soft">Processo #{item.process.number}</span>}
              </span>
              <span className="font-mono text-sm text-muted">{currencyFormatter.format(Number(item.amount))}</span>
              {canWrite && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
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
        <form action={action} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="flex-1 min-w-[180px]">
            <Input name="description" placeholder="Descrição do item" required />
          </div>
          <div className="w-32">
            <Input name="amount" type="number" step="0.01" min="0" placeholder="Valor" required />
          </div>
          {processes.length > 0 && (
            <div className="w-48">
              <Select name="processId" defaultValue="">
                <option value="">Sem processo vinculado</option>
                {processes.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.number} — {p.description.slice(0, 30)}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Salvando..." : "Adicionar"}
          </Button>
        </form>
      )}
      {error && <p className="mt-2 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
