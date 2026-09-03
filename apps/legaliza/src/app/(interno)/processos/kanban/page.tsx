import Link from "next/link";
import { prisma, type ProcessStatus } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { KanbanBoard, type Column } from "@/modules/processes/kanban-board";
import { updateProcessStatus } from "@/modules/processes/actions";

const COLUMNS: Column[] = [
  { status: "NEW", label: "Novo" },
  { status: "TRIAGE", label: "Triagem" },
  { status: "WAITING_DOCUMENTS", label: "Aguardando Documentos" },
  { status: "READY", label: "Pronto" },
  { status: "IN_PROGRESS", label: "Em Execução" },
  { status: "WAITING_CLIENT", label: "Aguardando Cliente" },
  { status: "WAITING_GOVERNMENT", label: "Aguardando Órgão" },
  { status: "PENDING", label: "Pendência" },
  { status: "COMPLETED", label: "Concluído" },
  { status: "CANCELLED", label: "Cancelado" },
  { status: "DRAFT", label: "Rascunho" },
];

export default async function ProcessesKanbanPage() {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const processes = await prisma.process.findMany({
    where: { tenantId: user.tenantId! },
    include: {
      client: { select: { name: true } },
      company: { select: { legalName: true } },
      steps: { select: { status: true, dueDate: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();
  const cards = processes.map((p) => ({
    id: p.id,
    type: p.type,
    clientName: p.client.name,
    companyName: p.company?.legalName ?? null,
    priority: p.priority,
    status: p.status,
    state: p.state,
    municipality: p.municipality,
    overdue: p.steps.some(
      (s) => s.status !== "COMPLETED" && s.status !== "CANCELLED" && s.dueDate && s.dueDate.getTime() < now
    ),
  }));

  async function updateStatus(processId: string, status: ProcessStatus) {
    "use server";
    await updateProcessStatus(processId, status);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Processos — Kanban</h1>
        <Link href="/processos" className="text-sm text-accent hover:underline">
          Ver lista →
        </Link>
      </div>
      <KanbanBoard columns={COLUMNS} cards={cards} canDrag updateStatus={updateStatus} />
    </div>
  );
}
