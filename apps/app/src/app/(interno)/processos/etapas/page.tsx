import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { StageManager } from "@/modules/processes/stage-manager";
import { WorkspaceTabs } from "@/modules/processes/workspace-tabs";
import { stageKind, taskProgress } from "@/modules/portal/progress";
import {
  createStage,
  renameStage,
  deleteStage,
  moveStage,
  setStageProgress, setStageAlertDays,
  createWorkspace,
  renameWorkspace,
  deleteWorkspace,
  setWorkspaceArchived,
  moveWorkspace,
} from "@/modules/processes/actions";

export default async function EtapasPage({ searchParams }: { searchParams: { area?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN" && user.role !== "GESTOR") redirect("/processos");

  const allWorkspaces = await prisma.workspace.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { position: "asc" },
  });
  const workspaces = allWorkspaces.filter((w) => !w.archivedAt);
  const archivedWorkspaces = allWorkspaces.filter((w) => w.archivedAt);

  const activeWorkspace = allWorkspaces.find((w) => w.id === searchParams.area) ?? workspaces[0] ?? allWorkspaces[0];
  const tabWorkspaces = activeWorkspace?.archivedAt ? [...workspaces, activeWorkspace] : workspaces;
  if (!activeWorkspace) redirect("/processos");

  const stages = await prisma.kanbanStage.findMany({
    where: { workspaceId: activeWorkspace.id },
    orderBy: { position: "asc" },
    include: { _count: { select: { processes: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/processos" className="text-sm text-accent hover:underline">
        ← Voltar para Área de Trabalho
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">Áreas de trabalho e etapas do Kanban</h1>
      <p className="mt-1 text-sm text-muted">
        Cada área de trabalho tem seu próprio quadro. Crie, renomeie, reordene ou remova áreas e etapas conforme o
        fluxo de trabalho — uma etapa ou área só pode ser excluída quando não houver tarefas nela; para tirar uma área do
        caminho sem perder nada, use Arquivar (botão ⋯ ao lado das abas).
      </p>

      <div className="mt-6">
        <WorkspaceTabs
          workspaces={tabWorkspaces.map((w) => ({ id: w.id, name: w.name, archived: !!w.archivedAt }))}
          activeId={activeWorkspace.id}
          basePath="/processos/etapas"
          createWorkspace={createWorkspace}
          manage={{ renameWorkspace, moveWorkspace }}
          options={{ archived: archivedWorkspaces.map((w) => ({ id: w.id, name: w.name })), setArchived: setWorkspaceArchived, deleteWorkspace }}
        />
      </div>

      <div className="mt-4">
        <StageManager
          stages={stages.map((s) => ({
            id: s.id,
            label: s.label,
            color: s.color,
            processCount: s._count.processes,
            progressPercent: s.progressPercent,
            alertAfterDays: s.alertAfterDays,
            // sugestão automática (sem % definido); etapas de pausa não entram no cálculo
            autoPercent: stageKind(s.label) === "pause" ? null : taskProgress(stages.map((x) => ({ id: x.id, label: x.label, position: x.position })), s.id).percent,
          }))}
          setProgress={setStageProgress}
          setAlertDays={setStageAlertDays}
          createStage={createStage.bind(null, activeWorkspace.id)}
          renameStage={renameStage}
          deleteStage={deleteStage}
          moveStage={moveStage}
        />
      </div>
    </div>
  );
}
