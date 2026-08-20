import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { displayStatus as invoiceDisplayStatus } from "@/modules/invoices/labels";
import { isProcessStale, hasUnreadClientComment } from "@/modules/processes/labels";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const ACTIVE_STAGE_FILTER = { notIn: ["Concluído", "Cancelado"] };

function KpiCard({ href, value, label }: { href?: string; value: string | number; label: string }) {
  const content = (
    <>
      <p className="text-2xl font-bold text-brand-navy">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="rounded-lg border border-slate-200 bg-white p-5 hover:shadow-sm">
        {content}
      </Link>
    );
  }
  return <div className="rounded-lg border border-slate-200 bg-white p-5">{content}</div>;
}

function AttentionCard({ href, value, label }: { href: string; value: number; label: string }) {
  return (
    <Link
      href={href}
      className={`rounded-lg border p-5 hover:shadow-sm ${
        value > 0 ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className={`text-2xl font-bold ${value > 0 ? "text-red-600" : "text-brand-navy"}`}>{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (user.role === "OPERACIONAL") {
    const [myOpenTasks, myActiveProcesses, myDeadlines, myOverdueProcesses, myProcessesForStale, myProcessesForUnread] =
      await Promise.all([
      prisma.task.count({
        where: { assigneeId: user.id, status: { not: "CONCLUIDA" }, process: { tenantId: user.tenantId } },
      }),
      prisma.process.count({
        where: { tenantId: user.tenantId, assignedUserId: user.id, stage: { label: ACTIVE_STAGE_FILTER } },
      }),
      prisma.process.findMany({
        where: {
          tenantId: user.tenantId,
          assignedUserId: user.id,
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
          assignedUserId: user.id,
          dueAt: { lt: now },
          stage: { label: ACTIVE_STAGE_FILTER },
        },
      }),
      prisma.process.findMany({
        where: { tenantId: user.tenantId, assignedUserId: user.id, stage: { label: ACTIVE_STAGE_FILTER } },
        select: {
          stage: { select: { label: true } },
          stageHistory: { orderBy: { changedAt: "desc" }, take: 1, select: { changedAt: true } },
        },
      }),
      prisma.process.findMany({
        where: { tenantId: user.tenantId, assignedUserId: user.id, stage: { label: ACTIVE_STAGE_FILTER } },
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
    ]);

    const myStaleProcesses = myProcessesForStale.filter(
      (p) => p.stageHistory[0] && isProcessStale(p.stage.label, p.stageHistory[0].changedAt)
    ).length;
    const myUnreadComments = myProcessesForUnread.filter((p) =>
      hasUnreadClientComment(p.comments[0]?.createdAt ?? null, p.commentReads[0]?.lastReadAt ?? null)
    ).length;

    return (
      <div className="p-8">
        <Header user={user} />

        <h2 className="mt-8 text-base font-semibold text-brand-navy">Minha carga de trabalho</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <KpiCard href="/processos" value={myActiveProcesses} label="Processos atribuídos a mim" />
          <KpiCard value={myOpenTasks} label="Tarefas pendentes" />
        </div>

        <h2 className="mt-6 text-base font-semibold text-brand-navy">Atenção</h2>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <AttentionCard href="/processos" value={myOverdueProcesses} label="Meus processos com prazo vencido" />
          <AttentionCard href="/processos" value={myStaleProcesses} label="Meus processos sem mudança de etapa há 5+ dias" />
          <AttentionCard href="/processos" value={myUnreadComments} label="Comentários do cliente não lidos" />
        </div>

        <DeadlinesList title="Meus prazos nos próximos 7 dias" deadlines={myDeadlines} />
      </div>
    );
  }

  const canSeeFinance = user.role === "ADMIN" || user.role === "GESTOR" || user.role === "FINANCEIRO";

  const [
    activeProcesses,
    activeClients,
    newClientsThisMonth,
    stages,
    deadlines,
    pendingInvoices,
    paidThisMonth,
    overdueProcesses,
    processesForStale,
    processesForUnread,
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
        ? prisma.invoice.findMany({ where: { tenantId: user.tenantId, status: "PENDENTE" } })
        : Promise.resolve([]),
      canSeeFinance
        ? prisma.invoice.aggregate({
            where: { tenantId: user.tenantId, status: "PAGA", paidAt: { gte: startOfMonth } },
            _sum: { totalAmount: true },
          })
        : Promise.resolve({ _sum: { totalAmount: null } }),
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
    ]);

  const pendingTotal = pendingInvoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const overdueInvoices = pendingInvoices.filter((i) => invoiceDisplayStatus(i.status, i.dueDate) === "ATRASADA");
  const overdueInvoicesCount = overdueInvoices.length;
  const overdueTotal = overdueInvoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);
  const upcomingCount = pendingInvoices.length - overdueInvoicesCount;
  const unreadCommentsCount = processesForUnread.filter((p) =>
    hasUnreadClientComment(p.comments[0]?.createdAt ?? null, p.commentReads[0]?.lastReadAt ?? null)
  ).length;
  const upcomingTotal = pendingTotal - overdueTotal;
  const maxStageCount = Math.max(1, ...stages.map((s) => s._count.processes));
  const staleProcessesCount = processesForStale.filter(
    (p) => p.stageHistory[0] && isProcessStale(p.stage.label, p.stageHistory[0].changedAt)
  ).length;

  return (
    <div className="p-8">
      <Header user={user} />

      <div className="mt-8 grid grid-cols-2 gap-4">
        <KpiCard href="/processos" value={activeProcesses} label="Processos ativos" />
        <KpiCard href="/clientes" value={activeClients} label={`Clientes ativos (${newClientsThisMonth} novos este mês)`} />
      </div>

      <h2 className="mt-6 text-base font-semibold text-brand-navy">Atenção</h2>
      <div className="mt-3 grid grid-cols-3 gap-4">
        <AttentionCard href="/processos" value={overdueProcesses} label="Processos com prazo vencido" />
        <AttentionCard href="/processos" value={staleProcessesCount} label="Processos sem mudança de etapa há 5+ dias" />
        <AttentionCard href="/processos" value={unreadCommentsCount} label="Comentários do cliente não lidos" />
      </div>

      {stages.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-brand-navy">Processos por etapa</h2>
          <div className="mt-4 space-y-2.5">
            {stages.map((stage) => (
              <div key={stage.id} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-slate-600">{stage.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(stage._count.processes / maxStageCount) * 100}%`,
                      backgroundColor: stage.color,
                    }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-sm font-medium text-slate-600">
                  {stage._count.processes}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DeadlinesList title="Prazos nos próximos 7 dias" deadlines={deadlines} />

      {canSeeFinance && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-brand-navy">Financeiro</h2>
            <Link href="/financeiro" className="text-sm text-brand-blue hover:underline">
              Ver faturas →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-xl font-bold text-brand-navy">{currencyFormatter.format(pendingTotal)}</p>
              <p className="text-sm text-slate-500">{pendingInvoices.length} fatura(s) pendente(s)</p>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{overdueInvoicesCount}</p>
              <p className="text-sm text-slate-500">fatura(s) atrasada(s)</p>
            </div>
            <div>
              <p className="text-xl font-bold text-brand-navy">{currencyFormatter.format(upcomingTotal)}</p>
              <p className="text-sm text-slate-500">{upcomingCount} previsto(s) dentro do prazo</p>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-600">
                {currencyFormatter.format(Number(paidThisMonth._sum.totalAmount ?? 0))}
              </p>
              <p className="text-sm text-slate-500">recebido este mês</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ user }: { user: { name: string; role: string } }) {
  return (
    <>
      <p className="text-sm text-slate-500">Bom dia,</p>
      <h1 className="mt-1 text-2xl font-bold text-brand-navy">{user.name}</h1>
      <p className="mt-1 text-sm text-slate-500">{ROLE_LABELS[user.role]}</p>
    </>
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
    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-base font-semibold text-brand-navy">{title}</h2>
      {deadlines.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">Nenhum prazo nos próximos 7 dias.</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {deadlines.map((process) => (
            <li key={process.id} className="flex items-center justify-between py-2.5 text-sm">
              <Link href={`/processos/${process.id}`} className="text-slate-700 hover:text-brand-navy hover:underline">
                #{process.number} — {process.client.name}
              </Link>
              <span className="text-xs text-slate-400">
                {process.dueAt?.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
