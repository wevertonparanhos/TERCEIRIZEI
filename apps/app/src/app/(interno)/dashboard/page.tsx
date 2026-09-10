import Link from "next/link";
import {
  Sparkles,
  ClipboardList,
  ListChecks,
  Users,
  AlertTriangle,
  Clock,
  MessageSquare,
  AtSign,
  Repeat,
  BarChart3,
  Calendar,
  TrendingUp,
  PieChart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { isProcessStale, hasUnreadClientComment } from "@/modules/processes/labels";
import { resolvePeriod, summarizePayments } from "@/modules/finance/period";
import { getLastMonths, sumByMonth, countByMonth, countByLabel } from "@/modules/dashboard/analytics";
import { RevenueChart, ProcessesTrendChart, ServiceTypeBarChart } from "@/modules/dashboard/charts";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const ACTIVE_STAGE_FILTER = { notIn: ["Concluído", "Cancelado"] };

function greeting(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

const TONE_BADGE: Record<"accent" | "danger" | "neutral", string> = {
  accent: "bg-accent-soft text-accent",
  danger: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400",
  neutral: "bg-surface-alt text-muted-soft",
};

function StatCard({
  href,
  value,
  label,
  icon: Icon,
  tone = "accent",
}: {
  href?: string;
  value: string | number;
  label: string;
  icon: LucideIcon;
  tone?: "accent" | "danger" | "neutral";
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-soft">{label}</p>
        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${TONE_BADGE[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-3 text-2xl font-bold ${tone === "danger" ? "text-red-600" : "text-ink"}`}>{value}</p>
    </>
  );
  const className = "rounded-2xl border border-border/70 bg-surface p-5 shadow-sm transition-shadow hover:shadow-md";
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}

function AttentionCard({ href, value, label, icon }: { href: string; value: number; label: string; icon: LucideIcon }) {
  return <StatCard href={href} value={value} label={label} icon={icon} tone={value > 0 ? "danger" : "neutral"} />;
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-muted-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (user.role === "OPERACIONAL") {
    const [
      myOpenTasks,
      myActiveProcesses,
      myDeadlines,
      myOverdueProcesses,
      myProcessesForStale,
      myProcessesForUnread,
      myOverdueRecurringTasks,
      myUnreadMentions,
    ] = await Promise.all([
      prisma.task.count({
        where: { assigneeId: user.id, status: { not: "CONCLUIDA" }, process: { tenantId: user.tenantId } },
      }),
      prisma.process.count({
        where: { tenantId: user.tenantId, assignees: { some: { userId: user.id } }, stage: { label: ACTIVE_STAGE_FILTER } },
      }),
      prisma.process.findMany({
        where: {
          tenantId: user.tenantId,
          assignees: { some: { userId: user.id } },
          dueAt: { gte: now, lte: in7Days },
          stage: { label: ACTIVE_STAGE_FILTER },
        },
        orderBy: { dueAt: "asc" },
        take: 5,
        include: { client: { select: { name: true } } },
      }),
      prisma.process.count({
        where: {
          tenantId: user.tenantId,
          assignees: { some: { userId: user.id } },
          dueAt: { lt: now },
          stage: { label: ACTIVE_STAGE_FILTER },
        },
      }),
      prisma.process.findMany({
        where: { tenantId: user.tenantId, assignees: { some: { userId: user.id } }, stage: { label: ACTIVE_STAGE_FILTER } },
        select: {
          stage: { select: { label: true } },
          stageHistory: { orderBy: { changedAt: "desc" }, take: 1, select: { changedAt: true } },
        },
      }),
      prisma.process.findMany({
        where: { tenantId: user.tenantId, assignees: { some: { userId: user.id } }, stage: { label: ACTIVE_STAGE_FILTER } },
        select: {
          comments: {
            where: { author: { role: { name: "CLIENTE" } } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
          commentReads: { where: { userId: user.id }, select: { lastReadAt: true } },
        },
      }),
      prisma.recurringTask.count({
        where: { tenantId: user.tenantId, assigneeId: user.id, active: true, nextDueAt: { lte: now } },
      }),
      prisma.processCommentMention.count({
        where: { mentionedUserId: user.id, readAt: null, comment: { process: { tenantId: user.tenantId } } },
      }),
    ]);

    const myStaleProcesses = myProcessesForStale.filter(
      (p) => p.stageHistory[0] && isProcessStale(p.stage.label, p.stageHistory[0].changedAt)
    ).length;
    const myUnreadComments = myProcessesForUnread.filter((p) =>
      hasUnreadClientComment(p.comments[0]?.createdAt ?? null, p.commentReads[0]?.lastReadAt ?? null)
    ).length;

    return (
      <div className="p-8">
        <Header user={user} now={now} />

        <h2 className="mt-8 text-base font-semibold text-ink">Minha carga de trabalho</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <StatCard href="/processos" value={myActiveProcesses} label="Processos atribuídos a mim" icon={ClipboardList} />
          <StatCard value={myOpenTasks} label="Tarefas pendentes" icon={ListChecks} />
        </div>

        <h2 className="mt-6 text-base font-semibold text-ink">Atenção</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          <AttentionCard href="/processos" value={myOverdueProcesses} label="Meus processos com prazo vencido" icon={AlertTriangle} />
          <AttentionCard
            href="/processos"
            value={myStaleProcesses}
            label="Meus processos sem mudança de etapa há 5+ dias"
            icon={Clock}
          />
          <AttentionCard href="/processos" value={myUnreadComments} label="Comentários do cliente não lidos" icon={MessageSquare} />
          <AttentionCard href="/processos" value={myUnreadMentions} label="Menções não lidas" icon={AtSign} />
          <AttentionCard
            href="/tarefas-recorrentes"
            value={myOverdueRecurringTasks}
            label="Minhas tarefas recorrentes atrasadas"
            icon={Repeat}
          />
        </div>

        <DeadlinesList title="Meus prazos nos próximos 7 dias" deadlines={myDeadlines} />
      </div>
    );
  }

  const canSeeFinance = user.role === "ADMIN" || user.role === "GESTOR" || user.role === "FINANCEIRO";

  const { start: monthStart, end: monthEnd } = resolvePeriod("mes", undefined, undefined, now);

  const last6Months = getLastMonths(6, now);
  const sixMonthsStart = new Date(Date.UTC(last6Months[0].year, last6Months[0].month, 1));

  const [
    activeProcesses,
    activeClients,
    newClientsThisMonth,
    stages,
    deadlines,
    paymentsThisMonth,
    overdueProcesses,
    processesForStale,
    processesForUnread,
    overdueRecurringTasks,
    unreadMentions,
    installmentsForChart,
    processesCreatedForChart,
    stageChangesConcludedForChart,
    activeProcessesByServiceType,
  ] = await Promise.all([
      prisma.process.count({ where: { tenantId: user.tenantId, stage: { label: ACTIVE_STAGE_FILTER } } }),
      prisma.client.count({ where: { tenantId: user.tenantId, status: "ativo" } }),
      prisma.client.count({ where: { tenantId: user.tenantId, createdAt: { gte: startOfMonth } } }),
      prisma.kanbanStage.findMany({
        where: { tenantId: user.tenantId },
        orderBy: { position: "asc" },
        include: { _count: { select: { processes: true } } },
      }),
      prisma.process.findMany({
        where: { tenantId: user.tenantId, dueAt: { gte: now, lte: in7Days }, stage: { label: ACTIVE_STAGE_FILTER } },
        orderBy: { dueAt: "asc" },
        take: 5,
        include: { client: { select: { name: true } } },
      }),
      canSeeFinance
        ? prisma.processInstallment.findMany({
            where: { process: { tenantId: user.tenantId }, paymentDueDate: { gte: monthStart, lte: monthEnd } },
            select: { value: true, paymentDueDate: true, paidAt: true },
          })
        : Promise.resolve([]),
      prisma.process.count({
        where: { tenantId: user.tenantId, dueAt: { lt: now }, stage: { label: ACTIVE_STAGE_FILTER } },
      }),
      prisma.process.findMany({
        where: { tenantId: user.tenantId, stage: { label: ACTIVE_STAGE_FILTER } },
        select: {
          stage: { select: { label: true } },
          stageHistory: { orderBy: { changedAt: "desc" }, take: 1, select: { changedAt: true } },
        },
      }),
      prisma.process.findMany({
        where: { tenantId: user.tenantId, stage: { label: ACTIVE_STAGE_FILTER } },
        select: {
          comments: {
            where: { author: { role: { name: "CLIENTE" } } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
          commentReads: { where: { userId: user.id }, select: { lastReadAt: true } },
        },
      }),
      prisma.recurringTask.count({
        where: { tenantId: user.tenantId, active: true, nextDueAt: { lte: now } },
      }),
      prisma.processCommentMention.count({
        where: { mentionedUserId: user.id, readAt: null, comment: { process: { tenantId: user.tenantId } } },
      }),
      canSeeFinance
        ? prisma.processInstallment.findMany({
            where: {
              process: { tenantId: user.tenantId },
              OR: [{ paymentDueDate: { gte: sixMonthsStart } }, { paidAt: { gte: sixMonthsStart } }],
            },
            select: { value: true, paymentDueDate: true, paidAt: true },
          })
        : Promise.resolve([]),
      prisma.process.findMany({
        where: { tenantId: user.tenantId, createdAt: { gte: sixMonthsStart } },
        select: { createdAt: true },
      }),
      prisma.processStage.findMany({
        where: { process: { tenantId: user.tenantId }, changedAt: { gte: sixMonthsStart }, toStage: { label: "Concluído" } },
        select: { changedAt: true },
      }),
      prisma.process.findMany({
        where: { tenantId: user.tenantId, stage: { label: ACTIVE_STAGE_FILTER } },
        select: { serviceType: { select: { name: true } } },
      }),
    ]);

  const previstoSeries = sumByMonth(
    installmentsForChart.map((r) => ({ date: r.paymentDueDate, value: Number(r.value) })),
    last6Months
  );
  const recebidoSeries = sumByMonth(
    installmentsForChart.map((r) => ({ date: r.paidAt, value: Number(r.value) })),
    last6Months
  );
  const revenueData = last6Months.map((m, i) => ({
    month: m.label,
    previsto: previstoSeries[i],
    recebido: recebidoSeries[i],
  }));

  const criadosSeries = countByMonth(
    processesCreatedForChart.map((r) => ({ date: r.createdAt })),
    last6Months
  );
  const concluidosSeries = countByMonth(
    stageChangesConcludedForChart.map((r) => ({ date: r.changedAt })),
    last6Months
  );
  const processesTrendData = last6Months.map((m, i) => ({
    month: m.label,
    criados: criadosSeries[i],
    concluidos: concluidosSeries[i],
  }));

  const serviceTypeData = countByLabel(activeProcessesByServiceType.map((p) => ({ label: p.serviceType.name })));

  const financeSummary = summarizePayments(
    paymentsThisMonth.map((p) => ({ value: Number(p.value), paymentDueDate: p.paymentDueDate, paidAt: p.paidAt }))
  );
  const unreadCommentsCount = processesForUnread.filter((p) =>
    hasUnreadClientComment(p.comments[0]?.createdAt ?? null, p.commentReads[0]?.lastReadAt ?? null)
  ).length;
  const maxStageCount = Math.max(1, ...stages.map((s) => s._count.processes));
  const staleProcessesCount = processesForStale.filter(
    (p) => p.stageHistory[0] && isProcessStale(p.stage.label, p.stageHistory[0].changedAt)
  ).length;

  return (
    <div className="p-8">
      <Header user={user} now={now} />

      <div className="mt-6 grid grid-cols-2 gap-4">
        <StatCard href="/processos" value={activeProcesses} label="Processos ativos" icon={ClipboardList} />
        <StatCard
          href="/clientes"
          value={activeClients}
          label={`Clientes ativos (${newClientsThisMonth} novos este mês)`}
          icon={Users}
        />
      </div>

      <div className="mt-8">
        <SectionHeader icon={AlertTriangle} title="Atenção" subtitle="O que precisa de uma olhada agora" />
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          <AttentionCard href="/processos" value={overdueProcesses} label="Processos com prazo vencido" icon={AlertTriangle} />
          <AttentionCard
            href="/processos"
            value={staleProcessesCount}
            label="Processos sem mudança de etapa há 5+ dias"
            icon={Clock}
          />
          <AttentionCard href="/processos" value={unreadCommentsCount} label="Comentários do cliente não lidos" icon={MessageSquare} />
          <AttentionCard href="/processos" value={unreadMentions} label="Menções não lidas" icon={AtSign} />
          <AttentionCard
            href="/tarefas-recorrentes"
            value={overdueRecurringTasks}
            label="Tarefas recorrentes atrasadas"
            icon={Repeat}
          />
        </div>
      </div>

      {stages.length > 0 && (
        <div className="mt-8 rounded-2xl border border-border/70 bg-surface p-6 shadow-sm">
          <SectionHeader icon={BarChart3} title="Processos por etapa" subtitle="Volume atual do Kanban" />
          <div className="mt-5 space-y-2.5">
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-muted">{stage.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-alt">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(stage._count.processes / maxStageCount) * 100}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-medium text-muted">
                  {stage._count.processes}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DeadlinesList title="Prazos nos próximos 7 dias" deadlines={deadlines} />

      <div className="mt-8">
        <SectionHeader icon={TrendingUp} title="Análises" subtitle="Como a operação andou nos últimos 6 meses" />
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <TrendingUp className="h-4 w-4 text-accent" /> Processos — últimos 6 meses
            </h3>
            <p className="text-xs text-muted-soft">Criados vs. concluídos por mês</p>
            <div className="mt-4">
              <ProcessesTrendChart data={processesTrendData} />
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <PieChart className="h-4 w-4 text-accent" /> Distribuição por tipo de serviço
            </h3>
            <p className="text-xs text-muted-soft">Processos ativos agora</p>
            <div className="mt-4">
              {serviceTypeData.length === 0 ? (
                <p className="text-sm text-muted-soft">Nenhum processo ativo no momento.</p>
              ) : (
                <ServiceTypeBarChart data={serviceTypeData} />
              )}
            </div>
          </div>
        </div>
      </div>

      {canSeeFinance && (
        <div className="mt-8 rounded-2xl border border-border/70 bg-surface p-6 shadow-sm">
          <SectionHeader
            icon={Wallet}
            title="Financeiro"
            subtitle="Demandas com pagamento previsto este mês"
            action={
              <Link href="/financeiro" className="text-sm text-accent hover:underline">
                Ver relatório →
              </Link>
            }
          />
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xl font-bold text-ink">{currencyFormatter.format(financeSummary.pendente)}</p>
              <p className="text-sm text-muted">pendente</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{currencyFormatter.format(financeSummary.atrasado)}</p>
              <p className="text-sm text-muted">atrasado</p>
            </div>
            <div>
              <p className="text-xl font-bold text-ink">{financeSummary.count}</p>
              <p className="text-sm text-muted">demanda(s) no mês</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">{currencyFormatter.format(financeSummary.recebido)}</p>
              <p className="text-sm text-muted">recebido este mês</p>
            </div>
          </div>

          <h3 className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink">
            <BarChart3 className="h-4 w-4 text-accent" /> Faturamento — últimos 6 meses
          </h3>
          <p className="text-xs text-muted-soft">Previsto vs. recebido por mês</p>
          <div className="mt-4">
            <RevenueChart data={revenueData} />
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ user, now }: { user: { name: string; role: string }; now: Date }) {
  const dateLabel = now
    .toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-accent-soft/70 via-surface to-surface p-6 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
        <Sparkles className="h-3.5 w-3.5" />
        {dateLabel}
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink">
        {greeting(now.getHours())}, <span className="text-accent">{user.name}</span>
      </h1>
      <p className="mt-1 text-sm text-muted">{ROLE_LABELS[user.role]} · aqui está o resumo de hoje.</p>
    </div>
  );
}

type DeadlineProcess = {
  id: string;
  number: number;
  dueAt: Date | null;
  client: { name: string };
};

function DeadlinesList({ title, deadlines }: { title: string; deadlines: DeadlineProcess[] }) {
  return (
    <div className="mt-8 rounded-2xl border border-border/70 bg-surface p-6 shadow-sm">
      <SectionHeader icon={Calendar} title={title} />
      {deadlines.length === 0 ? (
        <p className="mt-3 text-sm text-muted-soft">Nenhum prazo nos próximos 7 dias.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {deadlines.map((process) => (
            <li key={process.id} className="flex items-center justify-between py-2.5 text-sm">
              <Link href={`/processos/${process.id}`} className="text-ink hover:text-ink hover:underline">
                #{process.number} — {process.client.name}
              </Link>
              <span className="text-xs text-muted-soft">
                {process.dueAt?.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
