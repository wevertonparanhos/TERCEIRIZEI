import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, CalendarClock, AlertTriangle, Wallet, ShieldAlert, MessageSquare, Archive, type LucideIcon } from "lucide-react";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { KanbanBoard, type KanbanCard, type Stage } from "@/modules/processes/kanban-board";
import { ArchivedTable } from "@/modules/processes/archived-table";
import { WorkspaceTabs } from "@/modules/processes/workspace-tabs";
import {
  isProcessOverdue,
  hasUnreadClientComment,
  getProcessPaymentSummary,
  isPresenceActive,
  isDueToday,
  serviceTypeLabel,
} from "@/modules/processes/labels";
import { updateProcessStage, createWorkspace, createProcess, createCategory } from "@/modules/processes/actions";
import { NewTaskWizard } from "@/modules/processes/process-wizard";
import { ManageMenu } from "@/modules/processes/manage-menu";

function KpiCard({
  value,
  label,
  icon: Icon,
  tone = "neutral",
}: {
  value: number;
  label: string;
  icon: LucideIcon;
  tone?: "neutral" | "danger";
}) {
  const isDanger = tone === "danger" && value > 0;
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        isDanger ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10" : "border-border/70 bg-surface"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted">{label}</p>
        <span
          className={`flex h-7 w-7 flex-none items-center justify-center rounded-lg ${
            isDanger ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400" : "bg-accent-soft text-accent"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className={`mt-1.5 text-xl font-bold ${isDanger ? "text-red-600" : "text-ink"}`}>{value}</p>
    </div>
  );
}

export default async function ProcessosPage({ searchParams }: { searchParams: { area?: string; nova?: string; arquivadas?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"].includes(user.role)) redirect("/");

  const canManage = user.role === "ADMIN" || user.role === "GESTOR";
  const showArchived = searchParams.arquivadas === "1";

  const workspaces = await prisma.workspace.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { position: "asc" },
  });
  const activeWorkspace = workspaces.find((w) => w.id === searchParams.area) ?? workspaces[0];

  // Tudo que depende só da área ativa roda junto (antes a contagem de arquivadas
  // esperava sozinha uma ida ao banco antes das demais consultas).
  const [archivedCount, wizardData, stages, processes] = await Promise.all([
    activeWorkspace
      ? prisma.process.count({
          where: {
            tenantId: user.tenantId,
            workspaceId: activeWorkspace.id,
            archivedAt: { not: null },
            ...(user.role === "OPERACIONAL" ? { assignees: { some: { userId: user.id } } } : {}),
          },
        })
      : Promise.resolve(0),
    canManage
      ? Promise.all([
          prisma.workspace.findMany({
            where: { tenantId: user.tenantId },
            orderBy: { position: "asc" },
            select: { id: true, name: true, stages: { orderBy: { position: "asc" }, select: { id: true, label: true } } },
          }),
          prisma.client.findMany({
            where: { tenantId: user.tenantId, status: "ativo" },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          }),
          prisma.company.findMany({
            where: { tenantId: user.tenantId },
            select: { id: true, clientId: true, razaoSocial: true },
          }),
          prisma.taskTemplate.findMany({
            where: { tenantId: user.tenantId, active: true },
            orderBy: { name: "asc" },
            select: {
              id: true,
              name: true,
              defaultPrice: true,
              defaultDeadlineDays: true,
              defaultPriority: true,
              defaultNotes: true,
              checklist: { orderBy: { position: "asc" }, select: { label: true } },
            },
          }),
          prisma.serviceType.findMany({
            where: { tenantId: user.tenantId, active: true },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
          }),
        ])
      : Promise.resolve(null),
    activeWorkspace
      ? prisma.kanbanStage.findMany({ where: { workspaceId: activeWorkspace.id }, orderBy: { position: "asc" } })
      : Promise.resolve([]),
    prisma.process.findMany({
      where: {
        tenantId: user.tenantId,
        ...(activeWorkspace ? { workspaceId: activeWorkspace.id } : {}),
        archivedAt: showArchived ? { not: null } : null,
        ...(user.role === "OPERACIONAL" ? { assignees: { some: { userId: user.id } } } : {}),
      },
      include: {
        client: { select: { name: true } },
        serviceType: { select: { name: true } },
        serviceTypeTags: { select: { serviceType: { select: { name: true } } } },
        assignees: { include: { user: { select: { name: true } } } },
        stage: { select: { label: true } },
        comments: {
          where: { author: { role: { name: "CLIENTE" } } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        commentReads: { where: { userId: user.id }, select: { lastReadAt: true } },
        impediments: { where: { resolvedAt: null }, select: { id: true }, take: 1 },
        installments: { select: { value: true, paymentDueDate: true, paidAt: true } },
        presence: { include: { user: { select: { name: true } } } },
      },
      orderBy: { number: "desc" },
    }),
  ]);

  const stageLabelById = new Map(stages.map((s) => [s.id, s.label]));
  const stageList: Stage[] = stages.map((s) => ({ id: s.id, label: s.label, color: s.color }));
  const cards: KanbanCard[] = processes.map((p) => {
    const paymentSummary = getProcessPaymentSummary(
      p.installments.map((i) => ({ value: Number(i.value), paymentDueDate: i.paymentDueDate, paidAt: i.paidAt }))
    );
    return {
      id: p.id,
      number: p.number,
      title: p.description,
      clientName: p.client.name,
      serviceTypeName: serviceTypeLabel(p.serviceType.name, p.serviceTypeTags.map((t) => t.serviceType.name)),
      priority: p.priority,
      stageId: p.stageId,
      assigneeNames: p.assignees.map((a) => a.user.name),
      dueAt: p.dueAt ? p.dueAt.toISOString() : null,
      isOverdue: isProcessOverdue(p.dueAt, p.stage.label),
      hasUnreadComment: hasUnreadClientComment(p.comments[0]?.createdAt ?? null, p.commentReads[0]?.lastReadAt ?? null),
      value: paymentSummary.totalValue > 0 ? paymentSummary.totalValue : null,
      paymentStatus: paymentSummary.status,
      hasOpenImpediment: p.impediments.length > 0,
      activePresenceNames: p.presence.filter((pr) => isPresenceActive(pr.lastSeenAt)).map((pr) => pr.user.name),
      requestedByClient: p.requestedByClient,
    };
  });

  const canDrag = user.role !== "FINANCEIRO";

  const kpis = {
    total: cards.length,
    atrasadas: cards.filter((c) => c.isOverdue).length,
    entregaHoje: cards.filter((c) => isDueToday(c.dueAt ? new Date(c.dueAt) : null)).length,
    pagamentoAtrasado: cards.filter((c) => c.paymentStatus === "ATRASADO").length,
    comentarioNaoLido: cards.filter((c) => c.hasUnreadComment).length,
    impedimento: cards.filter((c) => c.hasOpenImpediment).length,
  };

  return (
    <div className="flex min-h-screen flex-col p-8 md:h-screen">
      <header className="relative flex-none rounded-2xl bg-gradient-to-br from-brand-navy via-brand-navy to-brand-blue px-6 py-5 text-white shadow-md sm:px-8 sm:py-6">
        {/* brilho ciano discreto no canto, no mesmo tom do login (recortado à parte para o menu Gerenciar poder sair do quadro) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-cyan/25 blur-3xl" />
        </div>
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-[#8A9AEA]">{showArchived ? "Área de Trabalho · Arquivadas" : "Área de Trabalho"}</p>
            <h1 className="mt-1 truncate font-display text-3xl font-bold tracking-tight">{showArchived ? "Tarefas arquivadas" : activeWorkspace?.name ?? "Área de Trabalho"}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/75">
              <span>
                <b className="font-semibold text-white">{kpis.total}</b> {showArchived ? "arquivada(s)" : "tarefas ativas"}
              </span>
              {!showArchived && kpis.atrasadas > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" />
                  <b className="font-semibold text-white">{kpis.atrasadas}</b> atrasadas
                </span>
              )}
              {!showArchived && kpis.entregaHoje > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                  <b className="font-semibold text-white">{kpis.entregaHoje}</b> para hoje
                </span>
              )}
            </p>
          </div>
        <div className="flex flex-wrap items-center gap-2">
          {activeWorkspace && (
            <Link
              href={showArchived ? `/processos?area=${activeWorkspace.id}` : `/processos?area=${activeWorkspace.id}&arquivadas=1`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-white/10 px-3.5 text-sm font-medium text-white ring-1 ring-inset ring-white/20 transition-colors hover:bg-white/20"
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Voltar ao quadro" : `Arquivadas (${archivedCount})`}
            </Link>
          )}
          {canManage && (
            <ManageMenu
              className="bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/20"
              items={[
                ...(activeWorkspace ? [{ href: `/processos/etapas?area=${activeWorkspace.id}`, label: "Etapas do quadro", hint: "Colunas, cores e % de conclusão", icon: "etapas" as const }] : []),
                { href: "/processos/modelos", label: "Modelos de tarefa", hint: "Tarefas prontas com valor, prazo e checklist", icon: "modelos" as const },
                { href: "/processos/tipos", label: "Tipos de solicitação", hint: "Etiquetas que identificam o serviço", icon: "tipos" as const },
              ]}
            />
          )}
          {canManage && activeWorkspace && wizardData && (
            <NewTaskWizard
              triggerClassName="h-10 bg-brand-orange text-white shadow-md hover:bg-brand-gold"
              workspaces={wizardData[0]}
              defaultWorkspaceId={activeWorkspace.id}
              clients={wizardData[1]}
              companies={wizardData[2]}
              templates={wizardData[3].map((t) => ({
                id: t.id,
                name: t.name,
                defaultPrice: t.defaultPrice ? String(t.defaultPrice) : null,
                defaultDeadlineDays: t.defaultDeadlineDays,
                defaultPriority: t.defaultPriority,
                defaultNotes: t.defaultNotes ?? "",
                checklist: t.checklist.map((c) => c.label),
              }))}
              serviceTypes={wizardData[4]}
              onSubmit={createProcess}
              createCategory={createCategory}
              autoOpen={searchParams.nova === "1"}
            />
          )}
        </div>
        </div>
      </header>

      {activeWorkspace && (
        <div className="mt-4 flex-none">
          <WorkspaceTabs
            workspaces={workspaces.map((w) => ({ id: w.id, name: w.name }))}
            activeId={activeWorkspace.id}
            basePath="/processos"
            createWorkspace={createWorkspace}
          />
        </div>
      )}

      {showArchived && (
      <div className="mt-4 grid flex-none grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard value={kpis.total} label="Total" icon={ClipboardList} />
        <KpiCard value={kpis.entregaHoje} label="Entrega hoje" icon={CalendarClock} />
        <KpiCard value={kpis.atrasadas} label="Atrasadas" icon={AlertTriangle} tone="danger" />
        <KpiCard value={kpis.pagamentoAtrasado} label="Pgto. atrasado" icon={Wallet} tone="danger" />
        <KpiCard value={kpis.impedimento} label="Impedimento" icon={ShieldAlert} tone="danger" />
        <KpiCard value={kpis.comentarioNaoLido} label="Comentário não lido" icon={MessageSquare} tone="danger" />
      </div>
      )}

      <div className="mt-4 flex-1 md:overflow-hidden">
        {showArchived ? (
          <ArchivedTable
            searchKey={`busca-arquivadas:${activeWorkspace?.id ?? ""}`}
            rows={cards.map((c) => ({
              id: c.id,
              number: c.number,
              title: c.title,
              clientName: c.clientName,
              stageLabel: stageLabelById.get(c.stageId) ?? "—",
              value: c.value,
              paymentLabel: c.paymentStatus === "PAGO" ? "Efetuado" : c.paymentStatus === "SEM_PAGAMENTO" ? "—" : "Pendente",
            }))}
          />
        ) : (
          <KanbanBoard
            stages={stageList}
            cards={cards}
            canDrag={canDrag}
            updateStage={updateProcessStage}
            searchKey={`busca-tarefas:${activeWorkspace?.id ?? ""}`}
          />
        )}
      </div>
    </div>
  );
}
