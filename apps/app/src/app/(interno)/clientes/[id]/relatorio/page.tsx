import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { PeriodFilter } from "@/modules/finance/period-filter";
import { resolvePeriod, PERIOD_KEYS, type PeriodKey } from "@/modules/finance/period";
import { loadStartLedger, loadOverdueForClient, todayBRT } from "@/modules/finance/ledger";
import { ClientReportBuilder, type ReportRow } from "@/modules/finance/client-report-builder";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const DAY_MS = 86400000;

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

  // Demandas INICIADAS no período (o início é a data de criação), com valor e previsão de pagamento.
  const { rows } = await loadStartLedger({ tenantId: user.tenantId, clientId: client.id, start, end });
  // Atrasados de TODOS os meses: tudo que o cliente não pagou até a data de pagamento prevista.
  const overdueAll = await loadOverdueForClient({ tenantId: user.tenantId, clientId: client.id });
  const monthIds = new Set(rows.map((r) => r.id));
  const overdueOther = overdueAll.filter((r) => !monthIds.has(r.id));

  const today = todayBRT();
  const daysLate = (due: Date | null, paid: boolean) =>
    !due || paid || due.getTime() >= today.getTime() ? 0 : Math.max(1, Math.round((today.getTime() - due.getTime()) / DAY_MS));
  const startBR = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const dueBR = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "");

  const reportRows: ReportRow[] = [
    ...rows.map((r) => ({
      id: r.id,
      group: "periodo" as const,
      number: r.number,
      title: r.title.slice(0, 70),
      startLabel: startBR(r.startDate),
      dueLabel: dueBR(r.paymentDueDate),
      daysLate: daysLate(r.paymentDueDate, !!r.paidAt),
      paid: !!r.paidAt,
      installmentLabel: r.installmentLabel,
      value: r.value,
    })),
    ...overdueOther.map((r) => ({
      id: r.id,
      group: "atraso" as const,
      number: r.number,
      title: r.title.slice(0, 70),
      startLabel: startBR(r.startDate),
      dueLabel: dueBR(r.paymentDueDate),
      daysLate: daysLate(r.paymentDueDate, false),
      paid: false,
      installmentLabel: r.installmentLabel,
      value: r.value,
    })),
  ];

  const undatedOpen = rows.filter((r) => !r.paidAt && !r.paymentDueDate);
  const undatedOpenTotal = undatedOpen.reduce((sum, r) => sum + r.value, 0);
  const periodLabel = `${start.toLocaleDateString("pt-BR", { timeZone: "UTC" })} a ${end.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
  const sameMonth = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  const monthName = start.toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
  const periodTitle = sameMonth ? `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} de ${start.getUTCFullYear()}` : periodLabel;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8 print:max-w-none print:p-0">
      <div className="space-y-6 print:hidden">
        <Link href={`/clientes/${client.id}`} className="text-sm text-accent hover:underline">
          ← Voltar para {client.name}
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-ink">Relatório para o cliente</h1>
          <p className="text-sm text-muted">
            {client.name} · demandas iniciadas no período, com a previsão de pagamento de cada uma
          </p>
        </div>

        <form method="get" className="flex flex-wrap items-end gap-2">
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

        <PeriodFilter current={periodKey} start={searchParams.inicio ?? ""} end={searchParams.fim ?? ""} />
      </div>

      <ClientReportBuilder
        clientName={client.name}
        periodTitle={periodTitle}
        periodLabel={periodLabel}
        rows={reportRows}
        hasUndatedWarning={
          undatedOpen.length > 0
            ? `${undatedOpen.length} parcela(s) em aberto sem previsão de pagamento (${currencyFormatter.format(undatedOpenTotal)}): ${undatedOpen
                .map((u) => `#${u.number}`)
                .join(", ")}.`
            : null
        }
      />
    </div>
  );
}
