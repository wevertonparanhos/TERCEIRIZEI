import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { StageManager } from "@/modules/processes/stage-manager";
import { createStage, renameStage, deleteStage, moveStage } from "@/modules/processes/actions";

export default async function EtapasPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN" && user.role !== "GESTOR") redirect("/processos");

  const stages = await prisma.kanbanStage.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { position: "asc" },
    include: { _count: { select: { processes: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/processos" className="text-sm text-brand-blue hover:underline">
        ← Voltar para Processos
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-navy">Etapas do Kanban</h1>
      <p className="mt-1 text-sm text-slate-500">
        Crie, renomeie, reordene ou remova as colunas do quadro de processos. Uma etapa só pode ser removida quando
        não houver processos nela.
      </p>

      <div className="mt-6">
        <StageManager
          stages={stages.map((s) => ({ id: s.id, label: s.label, color: s.color, processCount: s._count.processes }))}
          createStage={createStage}
          renameStage={renameStage}
          deleteStage={deleteStage}
          moveStage={moveStage}
        />
      </div>
    </div>
  );
}
