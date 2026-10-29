import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheckBig, Clock, AlertTriangle, Scale, Receipt, TriangleAlert, FilePlus2, FileText, ArrowDownRight, ArrowUpRight, Users } from "lucide-react";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { PeriodFilter } from "@/modules/finance/period-filter";
import { PERIOD_KEYS, PERIOD_LABELS, resolvePeriod, type PeriodKey } from "@/modules/finance/period";
import { loadLedger, todayBRT, type LedgerRow } from "@/modules/finance/ledger";
import { buildCashflow, daysOverdue, groupUpcomingByWeek, pctChange, previousRange, topClients } from "@/modules/finance/dashboard";
import { CashflowChart } from "@/modules/finance/cashflow-chart";
import { LedgerTable, type LedgerTableRow } from "@/modules/finance/ledger-table";
import { CsvExportButton } from "@/modules/finance/csv-export";
import { PrintButton } from "@/modules/finance/print-button";
import { ReceiveButton } from "@/modules/finance/receive-button";
import { markInstallmentPaid } from "@/modules/processes/actions";
import { getPaymentStatus } from "@/modules/processes/labels";

const DAY_MS = 24 * 60 * 60 * 1000;
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateShort = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit", month: "2-digit" }) : "—");

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[11px] text-muted-soft">sem comparação</span>;
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${up ? "text-emerald-600" : "text-red-500"}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(value).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%<span className="ml-1 font-normal text-muted-soft">vs. período anterior</span>
    </span>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  footer,
}: {
  label: string;
  value: string;
  icon: typeof Clock;
  tone?: "neutral" | "good" | "warn" | "danger";
  footer: React.ReactNode;
}) {
  const color = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-500" : tone === "danger" ? "text-red-600" : "text-ink";
  return (
    <div className="px-5 py-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold tracking-tight ${color}`}>{value}</p>
      <div className="mt-0.5 min-h-4">{footer}</div>
    </div>
  );
}

function SectionCard({ title, subtitle, aside, children }: { title: React.ReactNode; subtitle?: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function toTableRow(r: LedgerRow): LedgerTableRow {
  const status = getPaymentStatus(r.value, r.paymentDueDate, r.paidAt);
  return {
    id: r.id,
    kind: r.kind,
    processId: r.processId,
    invoiceId: r.invoiceId,
    number: r.number,
    clientId: r.clientId,
    clientName: r.clientName,
    title: r.title,
    installmentLabel: r.installmentLabel,
    value: r.value,
    due: r.paymentDueDate ? r.paymentDueDate.toISOString().slice(0, 10) : null,
    paid: !!r.paidAt,
    status,
  };
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { periodo?: string; inicio?: string; fim?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/");

  const periodKey: PeriodKey = PERIOD_KEYS.includes(searchParams.periodo as PeriodKey) ? (searchParams.periodo as PeriodKey) : "mes";
  const { start, end } = resolvePeriod(periodKey, searchParams.inicio, searchParams.fim);
  const previous = previousRange(start, end);
  const today = todayBRT();
  const horizon = new Date(today.getTime() + 30 * DAY_MS);

  const [current, before, open, clients] = await Promise.all([
    loadLedger({ tenantId: user.tenantId, start, end }),
    loadLedger({ tenantId: user.tenantId, start: previous.start, end: previous.end }),
    // tudo que está em aberto, de qualquer data até daqui a 30 dias: alimenta "Atrasados" e "Próximos recebimentos"
    loadLedger({ tenantId: user.tenantId, start: new Date(Date.UTC(2000, 0, 1)), end: horizon, onlyOpen: true }),
    prisma.client.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const { rows, undated, summary } = current;
  const prev = before.summary;
  const undatedOpen = undated.filter((u) => !u.paidAt);
  const undatedOpenTotal = undatedOpen.reduce((sum, u) => sum + u.value, 0);

  const tableRows = rows.map(toTableRow);
  const overdue = open.rows
    .filter((r) => r.paymentDueDate && getPaymentStatus(r.value, r.paymentDueDate, r.paidAt) === "ATRASADO")
    .sort((a, b) => a.paymentDueDate!.getTime() - b.paymentDueDate!.getTime());
  const overdueTotal = overdue.reduce((s, r) => s + r.value, 0);
  const upcoming = groupUpcomingByWeek(
    open.rows
      .filter((r) => r.paymentDueDate && getPaymentStatus(r.value, r.paymentDueDate, r.paidAt) === "PENDENTE")
      .map((r) => ({ id: r.id, label: r.title, clientName: r.clientName, dueDate: r.paymentDueDate!, value: r.value }))
  );
  const upcomingTotal = upcoming.reduce((s, g) => s + g.total, 0);

  const cashflow = buildCashflow(rows, start, end);
  const top = topClients(rows);
  const topMax = Math.max(1, ...top.map((c) => c.total));
  const periodLabel = periodKey === "personalizado" ? "Período escolhido" : PERIOD_LABELS[periodKey];

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Financeiro</h1>
          <p className="text-sm text-muted">Fluxo de caixa, recebimentos e saúde financeira de todos os clientes</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <CsvExportButton
            filename={`financeiro-${start.toISOString().slice(0, 10)}-a-${end.toISOString().slice(0, 10)}.csv`}
            rows={tableRows.map((r) => ({ due: r.due, title: r.title, clientName: r.clientName, value: r.value, status: r.status }))}
          />
          <PrintButton label="PDF" />
          <Link href="/financeiro/faturar">
            <Button variant="outline">
              <FileText className="mr-1.5 h-4 w-4" /> Faturar tarefas
            </Button>
          </Link>
          <Link href="/financeiro/nova">
            <Button>
              <FilePlus2 className="mr-1.5 h-4 w-4" /> Nova fatura
            </Button>
          </Link>
        </div>
      </div>

      <PeriodFilter current={periodKey} start={searchParams.inicio ?? ""} end={searchParams.fim ?? ""} />

      <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-sm lg:grid-cols-5 lg:divide-y-0">
        <Kpi label="Recebido" value={brl.format(summary.recebido)} icon={CircleCheckBig} tone="good" footer={<Trend value={pctChange(summary.recebido, prev.recebido)} />} />
        <Kpi label="A receber" value={brl.format(summary.aReceber)} icon={Clock} tone="warn" footer={<Trend value={pctChange(summary.aReceber, prev.aReceber)} />} />
        <Kpi
          label="Atrasado"
          value={brl.format(summary.atrasado)}
          icon={AlertTriangle}
          tone={summary.atrasado > 0 ? "danger" : "neutral"}
          footer={<span className="text-[11px] text-muted-soft">Pagamentos com data vencida</span>}
        />
        <Kpi label="Saldo previsto" value={brl.format(summary.saldoPrevisto)} icon={Scale} footer={<Trend value={pctChange(summary.saldoPrevisto, prev.saldoPrevisto)} />} />
        <Kpi label="Ticket médio" value={brl.format(summary.ticketMedio)} icon={Receipt} footer={<Trend value={pctChange(summary.ticketMedio, prev.ticketMedio)} />} />
      </div>

      {undatedOpen.length > 0 && (
        <details className="group rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 flex-none" />
              {undatedOpen.length} parcela(s) sem data de vencimento — {brl.format(undatedOpenTotal)} fora dos totais acima
            </span>
            <span className="text-xs font-medium underline group-open:hidden">Ver</span>
            <span className="hidden text-xs font-medium underline group-open:inline">Fechar</span>
          </summary>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Sem vencimento a parcela não pertence a nenhum período. Defina a data na aba Financeiro da tarefa.</p>
          <ul className="mt-2 space-y-1">
            {undatedOpen.slice(0, 12).map((u) => (
              <li key={u.id} className="text-sm">
                <Link href={`/processos/${u.processId}`} className="font-medium text-ink hover:underline">
                  #{u.number} — {u.title.slice(0, 50)}
                </Link>
                <span className="text-muted">
                  {" "}
                  · {u.clientName} · {brl.format(u.value)}
                </span>
              </li>
            ))}
            {undatedOpen.length > 12 && <li className="text-xs text-amber-700 dark:text-amber-400">+{undatedOpen.length - 12} parcela(s)</li>}
          </ul>
        </details>
      )}

      <SectionCard title={`Fluxo de caixa — ${periodLabel}`} subtitle="Entradas confirmadas, pendentes e acumulado, pela data de vencimento.">
        <CashflowChart data={cashflow} />
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Recebido
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> Pendente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Acumulado
          </span>
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Próximos recebimentos"
          subtitle="Pendentes nos próximos 30 dias"
          aside={<span className="text-sm font-bold text-amber-500">{brl.format(upcomingTotal)}</span>}
        >
          {upcoming.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-soft">Nada a vencer nos próximos 30 dias.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((g) => (
                <div key={g.key} className="overflow-hidden rounded-xl border border-border">
                  <div className="flex items-center justify-between bg-surface-alt px-3 py-1.5 text-xs font-semibold text-muted">
                    <span>{g.title}</span>
                    <span className="text-amber-500">{brl.format(g.total)}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    {g.items.slice(0, 4).map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-ink">{item.label}</p>
                          <p className="text-xs text-muted-soft">
                            {dateShort(item.dueDate)} · {item.clientName}
                          </p>
                        </div>
                        <span className="flex-none font-mono text-sm font-semibold text-ink">{brl.format(item.value)}</span>
                      </li>
                    ))}
                  </ul>
                  {g.items.length > 4 && <p className="border-t border-border px-3 py-1.5 text-center text-xs text-muted-soft">+{g.items.length - 4} pagamentos</p>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={
            <>
              Atrasados
              {overdue.length > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">{overdue.length}</span>}
            </>
          }
          subtitle="Pendentes com data já vencida"
          aside={<span className="text-sm font-bold text-red-600">{brl.format(overdueTotal)}</span>}
        >
          {overdue.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-soft">Nenhum pagamento atrasado. 🎉</p>
          ) : (
            <ul className="space-y-2">
              {overdue.slice(0, 8).map((r) => (
                <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-500/30 dark:bg-red-500/10">
                  <div className="min-w-0">
                    <Link href={r.processId ? `/processos/${r.processId}` : r.invoiceId ? `/financeiro/${r.invoiceId}` : "#"} className="block truncate text-sm font-medium text-ink hover:underline">
                      {r.title}
                    </Link>
                    <p className="text-xs text-red-700/80 dark:text-red-300/80">
                      {r.clientName} · {daysOverdue(r.paymentDueDate!, today)}d atrasado · venceu {dateShort(r.paymentDueDate)}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-red-600">{brl.format(r.value)}</span>
                    {r.kind === "parcela" && r.processId && <ReceiveButton processId={r.processId} installmentId={r.id} markPaid={markInstallmentPaid} />}
                  </div>
                </li>
              ))}
              {overdue.length > 8 && <li className="text-center text-xs text-muted-soft">+{overdue.length - 8} atrasados</li>}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title={
          <>
            <Users className="h-4 w-4 text-muted" /> Top clientes — {periodLabel}
          </>
        }
        subtitle="Por valor total movimentado"
      >
        {top.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-soft">Nenhum pagamento neste período.</p>
        ) : (
          <ul className="space-y-3">
            {top.map((c, i) => (
              <li key={c.clientId}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="text-xs text-muted-soft">#{i + 1}</span> <span className="font-semibold text-ink">{c.clientName}</span>
                    <span className="text-xs text-muted-soft"> · {c.count} pgtos</span>
                  </span>
                  <span className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-emerald-600">{brl.format(c.recebido)}</span>
                    <span className="text-amber-500">{brl.format(c.pendente)}</span>
                    <span className="font-semibold text-ink">{brl.format(c.total)}</span>
                  </span>
                </div>
                <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-surface-alt" style={{ width: `${Math.max(4, (c.total / topMax) * 100)}%` }}>
                  <div className="h-full bg-emerald-500" style={{ width: `${(c.recebido / c.total) * 100}%` }} />
                  <div className="h-full bg-amber-400" style={{ width: `${(c.pendente / c.total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <LedgerTable rows={tableRows} clients={clients} />
    </div>
  );
}
