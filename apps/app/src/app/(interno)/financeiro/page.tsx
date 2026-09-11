import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, CircleCheckBig, Clock, AlertTriangle } from "lucide-react";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PeriodFilter } from "@/modules/finance/period-filter";
import { resolvePeriod, summarizePayments, PERIOD_KEYS, type PeriodKey } from "@/modules/finance/period";
import { getPaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_BADGE_VARIANT } from "@/modules/processes/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { periodo?: string; inicio?: string; fim?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/");

  const periodKey: PeriodKey = PERIOD_KEYS.includes(searchParams.periodo as PeriodKey)
    ? (searchParams.periodo as PeriodKey)
    : "mes";
  const { start, end } = resolvePeriod(periodKey, searchParams.inicio, searchParams.fim);

  const installments = await prisma.processInstallment.findMany({
    where: {
      process: { tenantId: user.tenantId },
      paymentDueDate: { gte: start, lte: end },
    },
    include: { process: { select: { number: true, description: true, client: { select: { name: true } } } } },
    orderBy: { paymentDueDate: "asc" },
  });

  const countByProcess = new Map<string, number>();
  for (const i of installments) countByProcess.set(i.processId, (countByProcess.get(i.processId) ?? 0) + 1);

  const rows = installments.map((i) => ({
    id: i.id,
    processId: i.processId,
    number: i.process.number,
    clientName: i.process.client.name,
    description: i.process.description,
    installmentLabel: (countByProcess.get(i.processId) ?? 0) > 1 ? `Parcela ${i.position}` : null,
    value: Number(i.value),
    paymentDueDate: i.paymentDueDate,
    paidAt: i.paidAt,
  }));

  const summary = summarizePayments(rows);

  return (
    <div className="p-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Financeiro</h1>
        <p className="text-sm text-muted">Pagamentos de demandas de todos os clientes, por período.</p>
      </div>

      <div className="mt-6">
        <PeriodFilter current={periodKey} start={searchParams.inicio ?? ""} end={searchParams.fim ?? ""} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted">{summary.count} demanda(s) no período</p>
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent-soft text-accent">
              <ClipboardList className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-ink">{currencyFormatter.format(summary.total)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted">Recebido</p>
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <CircleCheckBig className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-emerald-600">{currencyFormatter.format(summary.recebido)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted">Pendente</p>
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent-soft text-accent">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-ink">{currencyFormatter.format(summary.pendente)}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-muted">Atrasado</p>
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-1.5 text-xl font-bold text-red-600">{currencyFormatter.format(summary.atrasado)}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70 bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Tarefa</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-soft">
                  Nenhuma demanda com pagamento neste período.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const status = getPaymentStatus(row.value, row.paymentDueDate, row.paidAt);
              return (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="px-4 py-3">
                    <Link href={`/processos/${row.processId}`} className="font-medium text-ink hover:underline">
                      #{row.number} — {row.description.slice(0, 40)}
                      {row.installmentLabel && <span className="text-muted-soft"> · {row.installmentLabel}</span>}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{row.clientName}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.paymentDueDate?.toLocaleDateString("pt-BR", { timeZone: "UTC" }) ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted">{currencyFormatter.format(row.value)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
