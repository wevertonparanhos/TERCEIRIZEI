"use client";

import Link from "next/link";
import { matchesSearch } from "@/modules/processes/search";
import { SearchInput, usePersistentSearch } from "@/modules/processes/search-input";

export type ArchivedRow = {
  id: string;
  number: number;
  title: string;
  clientName: string;
  stageLabel: string;
  value: number | null;
  paymentLabel: string;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ArchivedTable({ rows, searchKey = "busca-arquivadas" }: { rows: ArchivedRow[]; searchKey?: string }) {
  const [query, setQuery] = usePersistentSearch(searchKey);
  const visible = rows.filter((r) => matchesSearch([String(r.number), r.title, r.clientName, r.stageLabel], query));

  return (
    <div className="flex h-full flex-col gap-3">
      <SearchInput value={query} onChange={setQuery} className="max-w-md flex-none" />
      <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border/70 bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Tarefa</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Etapa</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-soft">
                  {rows.length === 0 ? "Nenhuma tarefa arquivada nesta área." : "Nenhuma tarefa encontrada para essa busca."}
                </td>
              </tr>
            )}
            {visible.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-surface-alt">
                <td className="px-4 py-2.5">
                  <Link href={`/processos/${r.id}`} className="font-medium text-ink hover:underline">
                    #{r.number} · {r.title}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted">{r.clientName}</td>
                <td className="px-4 py-2.5 text-muted">{r.stageLabel}</td>
                <td className="px-4 py-2.5 text-right font-mono text-muted">{r.value ? currency.format(r.value) : "—"}</td>
                <td className="px-4 py-2.5 text-muted">{r.paymentLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
