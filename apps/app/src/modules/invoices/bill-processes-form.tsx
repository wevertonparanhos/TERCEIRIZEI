"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProcessOption = { id: string; number: number; description: string; value: string };

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function BillProcessesForm({
  processes,
  defaultSelectedId,
  generateInvoice,
}: {
  processes: ProcessOption[];
  defaultSelectedId?: string;
  generateInvoice: (input: { processIds: string[]; dueDate: string; grouped: boolean }) => Promise<{ ids: string[] }>;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(defaultSelectedId && processes.some((p) => p.id === defaultSelectedId) ? [defaultSelectedId] : [])
  );
  const [grouped, setGrouped] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedTotal = processes
    .filter((p) => selected.has(p.id))
    .reduce((sum, p) => sum + Number(p.value), 0);

  async function submit(formData: FormData) {
    setError(null);
    if (selected.size === 0) {
      setError("Selecione ao menos um processo.");
      return;
    }
    const dueDate = formData.get("dueDate") as string;
    setSubmitting(true);
    try {
      const result = await generateInvoice({ processIds: Array.from(selected), dueDate, grouped });
      if (result.ids.length === 1) router.push(`/financeiro/${result.ids[0]}`);
      else router.push("/financeiro");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar a fatura.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form action={submit} className="space-y-4">
      <ul className="divide-y divide-slate-100">
        {processes.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2">
            <input
              type="checkbox"
              checked={selected.has(p.id)}
              onChange={() => toggle(p.id)}
              className="h-4 w-4 rounded border-slate-300"
              aria-label={`Selecionar processo #${p.number}`}
            />
            <span className="flex-1 text-sm text-slate-700">
              #{p.number} — {p.description.slice(0, 60)}
            </span>
            <span className="font-mono text-sm text-slate-600">{currencyFormatter.format(Number(p.value))}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
        <span className="text-slate-500">{selected.size} selecionado(s)</span>
        <span className="font-semibold text-brand-navy">{currencyFormatter.format(selectedTotal)}</span>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={grouped}
          onChange={(e) => setGrouped(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Agrupar em uma única fatura
      </label>
      {!grouped && selected.size > 1 && (
        <p className="text-xs text-slate-400">Será gerada uma fatura separada para cada processo selecionado.</p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Vencimento</Label>
        <Input id="dueDate" name="dueDate" type="date" required />
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Gerando..." : "Gerar fatura"}
      </Button>
    </form>
  );
}
