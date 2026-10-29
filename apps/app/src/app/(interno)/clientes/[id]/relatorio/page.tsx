import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PeriodFilter } from "@/modules/finance/period-filter";
import { resolvePeriod, PERIOD_KEYS, type PeriodKey } from "@/modules/finance/period";
import { loadStartLedger, loadOverdueForClient, todayBRT } from "@/modules/finance/ledger";
import { getPaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_BADGE_VARIANT } from "@/modules/processes/labels";
import { PrintButton } from "@/modules/finance/print-button";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ClienteRelatorioPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { periodo?: string; inicio?: string; fim?: string; mes?: string };
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
  // "Mês de referência" (AAAA-MM) tem prioridade: é o relatório mensal que vai para o cliente.
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.mes ?? "") ? (searchParams.mes as string) : null;
  const { start, end } = mes
    ? {
        start: new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5)) - 1, 1)),
        end: new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0, 23, 59, 59, 999)),
      }
    : resolvePeriod(periodKey, searchParams.inicio, searchParams.fim);

  // Demandas INICIADAS no período (data de início/criação da tarefa), com valor e previsão de pagamento.
  const { rows, summary } = await loadStartLedger({ tenantId: user.tenantId, clientId: client.id, start, end });
  // Atrasados de TODOS os meses: tudo que o cliente não pagou até a data de pagamento prevista.
  const overdueAll = await loadOverdueForClient({ tenantId: user.tenantId, clientId: client.id });
  const monthIds = new Set(rows.map((r) => r.id));
  const overdueOther = overdueAll.filter((r) => !monthIds.has(r.id));
  const overdueAllTotal = overdueAll.reduce((sum, r) => sum + r.value, 0);
  const overdueOtherTotal = overdueOther.reduce((sum, r) => sum + r.value, 0);
  const grandTotalOpen = summary.aReceber + overdueOtherTotal;
  const today = todayBRT();
  const daysLate = (due: Date | null) => (due ? Math.max(1, Math.round((today.getTime() - due.getTime()) / 86400000)) : 0);
  const undatedOpen = rows.filter((r) => !r.paidAt && !r.paymentDueDate);
  const undatedOpenTotal = undatedOpen.reduce((sum, r) => sum + r.value, 0);
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
          <p className="text-sm text-muted">
            {client.name} · demandas iniciadas no período, com a previsão de pagamento de cada uma
          </p>
        </div>
        <PrintButton />
      </div>

      <form method="get" className="flex flex-wrap items-end gap-2 print:hidden">
        <div className="space-y-1">
          <label htmlFor="mes" className="block text-xs font-medium text-muted">
            Mês de referência
          </label>
          <input
            id="mes"
            name="mes"
            type="month"
            defaultValue={mes ?? ""}
            className="h-9 rounded-lg border border-border-strong bg-surface px-3 text-sm text-ink"
          />
        </div>
        <button type="submit" className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent/90">
          Gerar
        </button>
      </form>

      <div className="print:hidden">
        <PeriodFilter current={periodKey} start={searchParams.inicio ?? ""} end={searchParams.fim ?? ""} />
      </div>

      {/* Cabeçalho só visível na impressão/PDF */}
      <div className="hidden print:block">
        <h1 className="text-xl font-bold text-ink">Relatório Financeiro — {client.name}</h1>
        <p className="text-sm text-muted">Demandas iniciadas de {periodLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-surface shadow-sm p-5 print:border-slate-300">
          <p className="text-xl font-bold text-ink">{currencyFormatter.format(summary.total)}</p>
          <p className="text-sm text-muted">Total ({summary.count})</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface shadow-sm p-5 print:border-slate-300">
          <p className="text-xl font-bold text-emerald-600">{currencyFormatter.format(summary.recebido)}</p>
          <p className="text-sm text-muted">Recebido</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-surface shadow-sm p-5 print:border-slate-300">
          <p className="text-xl font-bold text-ink">{currencyFormatter.format(summary.aReceber)}</p>
          <p className="text-sm text-muted">A receber</p>
        </div>
        <div className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-5 print:border-slate-300 print:bg-transparent">
          <p className="text-xl font-bold text-red-600">{currencyFormatter.format(overdueAllTotal)}</p>
          <p className="text-sm text-muted">
            Atrasado — todos os períodos ({overdueAll.length})
          </p>
        </div>
      </div>

      {overdueOther.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-red-200 bg-surface shadow-sm dark:border-red-500/30 print:border-slate-300">
          <div className="border-b border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10 print:bg-transparent">
            <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">Pagamentos em atraso de outros períodos</h2>
            <p className="text-xs text-muted">Parcelas de demandas iniciadas em outros meses que não foram pagas até a data prevista.</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted print:bg-transparent">
                <th className="px-4 py-3 font-medium">Início</th>
                <th className="px-4 py-3 font-medium">Tarefa</th>
                <th className="px-4 py-3 font-medium">Previsão de pagamento</th>
                <th className="px-4 py-3 font-medium">Atraso</th>
                <th className="px-4 py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {overdueOther.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted">{row.startDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                  <td className="px-4 py-3">
                    #{row.number} — {row.title.slice(0, 60)}
                    {row.installmentLabel && <span className="text-muted-soft"> · {row.installmentLabel}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.paymentDueDate?.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                  <td className="px-4 py-3 text-red-600">{daysLate(row.paymentDueDate)} dia(s)</td>
                  <td className="px-4 py-3 text-right font-mono text-muted">{currencyFormatter.format(row.value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-strong">
                <td colSpan={4} className="px-4 py-3 text-right font-semibold text-ink">
                  Total em atraso de outros períodos
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">{currencyFormatter.format(overdueOtherTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {undatedOpen.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 print:border-slate-300 print:bg-transparent">
          {undatedOpen.length} parcela(s) em aberto sem previsão de pagamento ({currencyFormatter.format(undatedOpenTotal)}):{" "}
          {undatedOpen.map((u) => `#${u.number}`).join(", ")}.
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-surface shadow-sm print:border-slate-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted print:bg-transparent">
              <th className="px-4 py-3 font-medium">Início</th>
              <th className="px-4 py-3 font-medium">Tarefa</th>
              <th className="px-4 py-3 font-medium">Previsão de pagamento</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-soft">
                  Nenhuma demanda iniciada neste período.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const status = getPaymentStatus(row.value, row.paymentDueDate, row.paidAt);
              return (
                <tr key={row.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-muted">{row.startDate.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                  <td className="px-4 py-3">
                    #{row.number} — {row.title.slice(0, 60)}
                    {row.installmentLabel && <span className="text-muted-soft"> · {row.installmentLabel}</span>}
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
                <td colSpan={4} className="px-4 py-3 text-right font-semibold text-ink">
                  Total pendente de pagamento
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-red-600">
                  {currencyFormatter.format(summary.aReceber)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {overdueOther.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-strong bg-surface px-5 py-4 shadow-sm print:border-slate-300">
          <div>
            <p className="text-sm font-semibold text-ink">Total geral a pagar</p>
            <p className="text-xs text-muted">Pendente das demandas do período + atrasados de outros períodos</p>
          </div>
          <p className="font-mono text-xl font-bold text-red-600">{currencyFormatter.format(grandTotalOpen)}</p>
        </div>
      )}
    </div>
  );
}