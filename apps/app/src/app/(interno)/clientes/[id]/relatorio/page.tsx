import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PeriodFilter } from "@/modules/finance/period-filter";
import { resolvePeriod, summarizePayments, PERIOD_KEYS, type PeriodKey } from "@/modules/finance/period";
import { getPaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_BADGE_VARIANT } from "@/modules/processes/labels";
import { PrintButton } from "@/modules/finance/print-button";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ClienteRelatorioPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { periodo?: string; inicio?: string; fim?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/");

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    select: { id: true, name: true },
  });
  if (!client) notFound();

  const periodKey: PeriodKey = PERIOD_KEYS.includes(searchParams.periodo as PeriodKey)
    ? (searchParams.periodo as PeriodKey)
    : "mes";
  const { start, end } = resolvePeriod(periodKey, searchParams.inicio, searchParams.fim);

  const processes = await prisma.process.findMany({
    where: {
      tenantId: user.tenantId,
      clientId: client.id,
      value: { not: null },
      paymentDueDate: { gte: start, lte: end },
    },
    orderBy: { paymentDueDate: "asc" },
  });

  const rows = processes.map((p) => ({
    id: p.id,
    number: p.number,
    description: p.description,
    value: Number(p.value),
    paymentDueDate: p.paymentDueDate,
    paidAt: p.paidAt,
  }));

  const summary = summarizePayments(rows);
  const periodLabel = `${start.toLocaleDateString("pt-BR", { timeZone: "UTC" })} até ${end.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8 print:p-0">
      <div className="print:hidden">
        <Link href={`/clientes/${client.id}`} className="text-sm text-accent hover:underline">
          ← Voltar para {client.name}
        </Link>
      </div>

      <div className="flex items-start justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-ink">Relatório Financeiro</h1>
          <p className="text-sm text-muted">{client.name}</p>
        </div>
        <PrintButton />
      </div>

      <div className="print:hidden">
        <PeriodFilter current={periodKey} start={searchParams.inicio ?? ""} end={searchParams.fim ?? ""} />
      </div>

      {/* Cabeçalho só visível na impressão/PDF */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold text-ink">Relatório Financeiro — {client.name}</h1>
        <p className="text-sm text-muted">Período: {periodLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-5 print:border-slate-300">
          <p className="text-xl font-bold text-ink">{currencyFormatter.format(summary.total)}</p>
          <p className="text-sm text-muted">Total ({summary.count})</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 print:border-slate-300">
          <p className="text-xl font-bold text-emerald-600">{currencyFormatter.format(summary.recebido)}</p>
          <p className="text-sm text-muted">Recebido</p>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 print:border-slate-300">
          <p className="text-xl font-bold text-ink">{currencyFormatter.format(summary.pendente)}</p>
          <p className="text-sm text-muted">Pendente</p>
        </div>
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-5 print:border-slate-300 print:bg-transparent">
          <p className="text-xl font-bold text-red-600">{currencyFormatter.format(summary.atrasado)}</p>
          <p className="text-sm text-muted">Atrasado</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface print:border-slate-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted print:bg-transparent">
              <th className="px-4 py-3 font-medium">Processo</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-soft">
                  Nenhuma demanda com pagamento neste período.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const status = getPaymentStatus(row.value, row.paymentDueDate, row.paidAt);
              return (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    #{row.number} — {row.description.slice(0, 60)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.paymentDueDate?.toLocaleDateString("pt-BR", { timeZone: "UTC" }) ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-muted">{currencyFormatter.format(row.value)}</td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border-strong">
                <td colSpan={3} className="px-4 py-3 text-right font-semibold text-ink">
                  Total pendente de pagamento
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">
                  {currencyFormatter.format(summary.pendente + summary.atrasado)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
