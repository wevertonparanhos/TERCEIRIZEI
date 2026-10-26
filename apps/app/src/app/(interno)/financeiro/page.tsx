import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleCheckBig, Clock, AlertTriangle, Scale, Receipt, TriangleAlert, FilePlus2, FileText } from "lucide-react";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PeriodFilter } from "@/modules/finance/period-filter";
import { PERIOD_KEYS, resolvePeriod, type PeriodKey } from "@/modules/finance/period";
import { loadLedger } from "@/modules/finance/ledger";
import { ReceiveButton } from "@/modules/finance/receive-button";
import { markInstallmentPaid } from "@/modules/processes/actions";
import { getPaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_BADGE_VARIANT } from "@/modules/processes/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const STATUS_FILTERS = ["todos", "recebidos", "pendentes", "atrasados"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];
const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  todos: "Todos",
  recebidos: "Recebidos",
  pendentes: "Pendentes",
  atrasados: "Atrasados",
};

function Kpi({
  label,
  value,
  icon: Icon,
  tone = "accent",
}: {
  label: string;
  value: string;
  icon: typeof Clock;
  tone?: "accent" | "good" | "danger";
}) {
  const badge =
    tone === "good"
      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
      : tone === "danger"
        ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        : "bg-accent-soft text-accent";
  const valueColor = tone === "good" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : "text-ink";
  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted">{label}</p>
        <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${badge}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-1.5 text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { periodo?: string; inicio?: string; fim?: string; status?: string; cliente?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/");

  const periodKey: PeriodKey = PERIOD_KEYS.includes(searchParams.periodo as PeriodKey)
    ? (searchParams.periodo as PeriodKey)
    : "mes";
  const statusFilter: StatusFilter = STATUS_FILTERS.includes(searchParams.status as StatusFilter)
    ? (searchParams.status as StatusFilter)
    : "todos";
  const { start, end } = resolvePeriod(periodKey, searchParams.inicio, searchParams.fim);

  const [{ rows, undated, summary }, clients] = await Promise.all([
    loadLedger({ tenantId: user.tenantId, clientId: searchParams.cliente || undefined, start, end }),
    prisma.client.findMany({ where: { tenantId: user.tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const undatedOpen = undated.filter((u) => !u.paidAt);
  const undatedOpenTotal = undatedOpen.reduce((sum, u) => sum + u.value, 0);

  const withStatus = rows.map((r) => ({ ...r, status: getPaymentStatus(r.value, r.paymentDueDate, r.paidAt) }));
  const visibleRows = withStatus.filter((r) =>
    statusFilter === "recebidos"
      ? r.status === "PAGO"
      : statusFilter === "pendentes"
        ? r.status === "PENDENTE"
        : statusFilter === "atrasados"
          ? r.status === "ATRASADO"
          : true
  );

  const filterHref = (status: StatusFilter) => ({
    pathname: "/financeiro",
    query: {
      ...(searchParams.periodo ? { periodo: searchParams.periodo } : {}),
      ...(searchParams.inicio ? { inicio: searchParams.inicio } : {}),
      ...(searchParams.fim ? { fim: searchParams.fim } : {}),
      ...(searchParams.cliente ? { cliente: searchParams.cliente } : {}),
      ...(status !== "todos" ? { status } : {}),
    },
  });

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Financeiro</h1>
          <p className="text-sm text-muted">Pagamentos de tarefas e faturas de todos os clientes, por período.</p>
        </div>
        <div className="flex gap-2">
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

      <div className="mt-6">
        <PeriodFilter current={periodKey} start={searchParams.inicio ?? ""} end={searchParams.fim ?? ""} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Recebido" value={currencyFormatter.format(summary.recebido)} icon={CircleCheckBig} tone="good" />
        <Kpi label="A receber" value={currencyFormatter.format(summary.aReceber)} icon={Clock} />
        <Kpi label="Atrasado" value={currencyFormatter.format(summary.atrasado)} icon={AlertTriangle} tone="danger" />
        <Kpi label="Saldo previsto" value={currencyFormatter.format(summary.saldoPrevisto)} icon={Scale} />
        <Kpi label="Ticket médio" value={currencyFormatter.format(summary.ticketMedio)} icon={Receipt} />
      </div>

      {undatedOpen.length > 0 && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
            <TriangleAlert className="h-4 w-4" />
            {undatedOpen.length} parcela(s) sem data de vencimento — {currencyFormatter.format(undatedOpenTotal)} fora dos totais acima
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Sem vencimento a parcela não pertence a nenhum período. Defina a data na aba Pagamentos da tarefa.
          </p>
          <ul className="mt-2 space-y-1">
            {undatedOpen.map((u) => (
              <li key={u.id} className="text-sm">
                <Link href={`/processos/${u.processId}`} className="font-medium text-ink hover:underline">
                  #{u.number} — {u.title.slice(0, 50)}
                </Link>
                <span className="text-muted"> · {u.clientName} · {currencyFormatter.format(u.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <Link
              key={s}
              href={filterHref(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-accent text-white" : "bg-surface-alt text-muted hover:text-ink"
              }`}
            >
              {STATUS_FILTER_LABELS[s]}
            </Link>
          ))}
        </div>
        <form method="get" className="flex items-center gap-2">
          {searchParams.periodo && <input type="hidden" name="periodo" value={searchParams.periodo} />}
          {searchParams.inicio && <input type="hidden" name="inicio" value={searchParams.inicio} />}
          {searchParams.fim && <input type="hidden" name="fim" value={searchParams.fim} />}
          {statusFilter !== "todos" && <input type="hidden" name="status" value={statusFilter} />}
          <Select name="cliente" defaultValue={searchParams.cliente ?? ""} className="max-w-[220px]">
            <option value="">Todos clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
        </form>
      </div>

      <p className="mt-3 text-xs text-muted">
        {summary.count} pagamento(s) · {currencyFormatter.format(summary.recebido)} recebido · {currencyFormatter.format(summary.aReceber)} a receber
      </p>

      <div className="mt-3 overflow-x-auto rounded-2xl border border-border/70 bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Tarefa</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-soft">
                  Nenhum pagamento neste período.
                </td>
              </tr>
            )}
            {visibleRows.map((row) => (
              <tr key={`${row.kind}-${row.id}`} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="px-4 py-3 text-muted">
                  {row.paymentDueDate?.toLocaleDateString("pt-BR", { timeZone: "UTC" }) ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {row.kind === "parcela" ? (
                    <Link href={`/processos/${row.processId}`} className="font-medium text-ink hover:underline">
                      #{row.number} — {row.title.slice(0, 40)}
                      {row.installmentLabel && <span className="text-muted-soft"> · {row.installmentLabel}</span>}
                    </Link>
                  ) : (
                    <Link href={`/financeiro/${row.invoiceId}`} className="font-medium text-ink hover:underline">
                      {row.title.slice(0, 50)}
                      <span className="text-muted-soft"> · {row.installmentLabel}</span>
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{row.clientName}</td>
                <td className="px-4 py-3 font-mono text-muted">{currencyFormatter.format(row.value)}</td>
                <td className="px-4 py-3">
                  <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[row.status]}>{PAYMENT_STATUS_LABELS[row.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {row.kind === "parcela" && !row.paidAt && row.processId && (
                    <ReceiveButton processId={row.processId} installmentId={row.id} markPaid={markInstallmentPaid} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
