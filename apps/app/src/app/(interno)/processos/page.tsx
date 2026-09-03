import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { KanbanBoard, type KanbanCard, type Stage } from "@/modules/processes/kanban-board";
import {
  isProcessOverdue,
  hasUnreadClientComment,
  getProcessPaymentSummary,
  isPresenceActive,
  isDueToday,
} from "@/modules/processes/labels";
import { updateProcessStage } from "@/modules/processes/actions";

function KpiCard({ value, label, tone = "neutral" }: { value: number; label: string; tone?: "neutral" | "danger" }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        tone === "danger" && value > 0
          ? "border-red-200 bg-red-50 dark:border-red-500/30 dark:bg-red-500/10"
          : "border-border bg-surface"
      }`}
    >
      <p className={`text-xl font-bold ${tone === "danger" && value > 0 ? "text-red-600" : "text-ink"}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default async function ProcessosPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"].includes(user.role)) redirect("/");

  const canManage = user.role === "ADMIN" || user.role === "GESTOR";

  const [stages, processes] = await Promise.all([
    prisma.kanbanStage.findMany({ where: { tenantId: user.tenantId }, orderBy: { position: "asc" } }),
    prisma.process.findMany({
      where: {
        tenantId: user.tenantId,
        ...(user.role === "OPERACIONAL" ? { assignees: { some: { userId: user.id } } } : {}),
      },
      include: {
        client: { select: { name: true } },
        serviceType: { select: { name: true } },
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

  const stageList: Stage[] = stages.map((s) => ({ id: s.id, label: s.label, color: s.color }));
  const cards: KanbanCard[] = processes.map((p) => {
    const paymentSummary = getProcessPaymentSummary(
      p.installments.map((i) => ({ value: Number(i.value), paymentDueDate: i.paymentDueDate, paidAt: i.paidAt }))
    );
    return {
      id: p.id,
      number: p.number,
      clientName: p.client.name,
      serviceTypeName: p.serviceType.name,
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
    <div className="flex h-screen flex-col p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Processos</h1>
          <p className="text-sm text-muted">{processes.length} processo(s)</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Link href="/processos/etapas">
              <Button variant="outline">Gerenciar etapas</Button>
            </Link>
          )}
          {canManage && (
            <Link href="/processos/nova">
              <Button>+ Novo Processo</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mt-4 grid flex-none grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard value={kpis.total} label="Total" />
        <KpiCard value={kpis.entregaHoje} label="Entrega hoje" />
        <KpiCard value={kpis.atrasadas} label="Atrasadas" tone="danger" />
        <KpiCard value={kpis.pagamentoAtrasado} label="Pgto. atrasado" tone="danger" />
        <KpiCard value={kpis.impedimento} label="Impedimento" tone="danger" />
        <KpiCard value={kpis.comentarioNaoLido} label="Comentário não lido" tone="danger" />
      </div>

      <div className="mt-4 flex-1 overflow-hidden">
        <KanbanBoard stages={stageList} cards={cards} canDrag={canDrag} updateStage={updateProcessStage} />
      </div>
    </div>
  );
}
