import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { KanbanBoard, type KanbanCard, type Stage } from "@/modules/processes/kanban-board";
import { isProcessOverdue } from "@/modules/processes/labels";
import { updateProcessStage } from "@/modules/processes/actions";

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
        ...(user.role === "OPERACIONAL" ? { assignedUserId: user.id } : {}),
      },
      include: {
        client: { select: { name: true } },
        serviceType: { select: { name: true } },
        assignedUser: { select: { name: true } },
        stage: { select: { label: true } },
      },
      orderBy: { number: "desc" },
    }),
  ]);

  const stageList: Stage[] = stages.map((s) => ({ id: s.id, label: s.label, color: s.color }));
  const cards: KanbanCard[] = processes.map((p) => ({
    id: p.id,
    number: p.number,
    clientName: p.client.name,
    serviceTypeName: p.serviceType.name,
    priority: p.priority,
    stageId: p.stageId,
    assignedUserName: p.assignedUser?.name ?? null,
    dueAt: p.dueAt ? p.dueAt.toISOString() : null,
    isOverdue: isProcessOverdue(p.dueAt, p.stage.label),
  }));

  const canDrag = user.role !== "FINANCEIRO";

  return (
    <div className="flex h-screen flex-col p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Processos</h1>
          <p className="text-sm text-slate-500">{processes.length} processo(s)</p>
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

      <div className="mt-6 flex-1 overflow-hidden">
        <KanbanBoard stages={stageList} cards={cards} canDrag={canDrag} updateStage={updateProcessStage} />
      </div>
    </div>
  );
}
