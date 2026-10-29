"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { ReceiveButton } from "@/modules/finance/receive-button";
import { markInstallmentPaid } from "@/modules/processes/actions";
import { PAYMENT_STATUS_BADGE_VARIANT, PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/modules/processes/labels";

export type LedgerTableRow = {
  id: string;
  kind: "parcela" | "fatura";
  processId: string | null;
  invoiceId: string | null;
  number: number | null;
  clientId: string;
  clientName: string;
  title: string;
  installmentLabel: string | null;
  value: number;
  /** AAAA-MM-DD (dia do vencimento) ou null */
  due: string | null;
  paid: boolean;
  status: PaymentStatus;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateBr = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—");

type StatusTab = "todos" | "recebidos" | "pendentes" | "atrasados";
const TABS: { key: StatusTab; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "recebidos", label: "Recebidos" },
  { key: "pendentes", label: "Pendentes" },
  { key: "atrasados", label: "Atrasados" },
];

function matches(row: LedgerTableRow, tab: StatusTab): boolean {
  if (tab === "recebidos") return row.status === "PAGO";
  if (tab === "pendentes") return row.status === "PENDENTE";
  if (tab === "atrasados") return row.status === "ATRASADO";
  return true;
}

/** Movimentações do período: busca, filtro por cliente e por status, tudo na própria tela (sem recarregar). */
export function LedgerTable({ rows, clients }: { rows: LedgerTableRow[]; clients: { id: string; name: string }[] }) {
  const [tab, setTab] = useState<StatusTab>("todos");
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState("");

  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!clientId || r.clientId === clientId) &&
        (!q || r.title.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q) || (r.number != null && String(r.number) === q))
    );
  }, [rows, query, clientId]);

  const counts = useMemo(
    () => ({
      todos: scoped.length,
      recebidos: scoped.filter((r) => matches(r, "recebidos")).length,
      pendentes: scoped.filter((r) => matches(r, "pendentes")).length,
      atrasados: scoped.filter((r) => matches(r, "atrasados")).length,
    }),
    [scoped]
  );
  const visible = scoped.filter((r) => matches(r, tab));
  const recebido = scoped.filter((r) => r.paid).reduce((s, r) => s + r.value, 0);
  const aReceber = scoped.filter((r) => !r.paid).reduce((s, r) => s + r.value, 0);

  return (
    <section className="rounded-2xl border border-border/70 bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="text-base font-semibold text-ink">Movimentações do período</h2>
          <p className="text-xs text-muted">
            {scoped.length} pagamento(s) · <span className="font-semibold text-emerald-600">{brl.format(recebido)}</span> recebido ·{" "}
            <span className="font-semibold text-amber-600">{brl.format(aReceber)}</span> pendente
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar tarefa ou cliente..."
              aria-label="Buscar pagamentos"
              className="h-9 w-56 rounded-lg border border-border-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-muted-soft focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>
          <Select value={clientId} onChange={(e) => setClientId(e.target.value)} aria-label="Filtrar por cliente" className="h-9 max-w-[200px]">
            <option value="">Todos clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${tab === t.key ? "bg-accent text-white" : "text-muted hover:bg-surface-alt hover:text-ink"}`}
          >
            {t.label} <span className={tab === t.key ? "text-white/80" : "text-muted-soft"}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-soft">
              <th className="px-4 py-2.5 font-medium">Data</th>
              <th className="px-4 py-2.5 font-medium">Tarefa</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 text-right font-medium">Valor</th>
              <th className="px-4 py-2.5 text-center font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-soft">
                  Nenhum pagamento encontrado.
                </td>
              </tr>
            )}
            {visible.map((row) => {
              const href = row.kind === "parcela" && row.processId ? `/processos/${row.processId}` : row.invoiceId ? `/financeiro/${row.invoiceId}` : null;
              return (
                <tr key={`${row.kind}-${row.id}`} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{dateBr(row.due)}</td>
                  <td className="px-4 py-3">
                    {href ? (
                      <Link href={href} className="block max-w-md hover:underline">
                        <span className="block truncate font-medium text-ink">{row.title}</span>
                        <span className="block text-xs text-muted-soft">
                          {row.kind === "parcela" ? `#${row.number}` : "Fatura"}
                          {row.installmentLabel ? ` · ${row.installmentLabel}` : ""}
                        </span>
                      </Link>
                    ) : (
                      <span className="font-medium text-ink">{row.title}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.clientName}</td>
                  <td className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold ${row.paid ? "text-emerald-600" : "text-ink"}`}>{brl.format(row.value)}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[row.status]}>{PAYMENT_STATUS_LABELS[row.status]}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right print:hidden">
                    <span className="inline-flex items-center gap-2">
                      {row.kind === "parcela" && !row.paid && row.processId && <ReceiveButton processId={row.processId} installmentId={row.id} markPaid={markInstallmentPaid} />}
                      {href && (
                        <Link href={href} aria-label="Abrir" className="text-muted-soft hover:text-ink">
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
