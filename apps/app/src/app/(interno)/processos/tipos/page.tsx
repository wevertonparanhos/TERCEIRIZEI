import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ServiceTypeManager, type ServiceTypeItem } from "@/modules/service-types/service-type-manager";

export default async function TiposDeSolicitacaoPage({ searchParams }: { searchParams: { area?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/processos");

  const [workspaces, types] = await Promise.all([
    prisma.workspace.findMany({ where: { tenantId: user.tenantId, archivedAt: null }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
    prisma.serviceType.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, active: true, workspaceId: true, processTags: { select: { processId: true } }, _count: { select: { processes: true } } },
    }),
  ]);

  const items: ServiceTypeItem[] = types.map((t) => ({
    id: t.id,
    name: t.name,
    workspaceId: t.workspaceId,
    active: t.active,
    taskCount: Math.max(t.processTags.length, t._count.processes),
  }));
  const initialWorkspaceId = workspaces.find((w) => w.id === searchParams.area)?.id ?? workspaces[0]?.id ?? "";

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <div>
        <Link href="/processos" className="text-sm text-accent hover:underline">
          ← Voltar para Área de Trabalho
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">Tipos de solicitação</h1>
        <p className="text-sm text-muted">
          Etiquetas que identificam qual é o serviço da tarefa, separadas por área de trabalho. Uma tarefa pode ter mais de um tipo, sempre da área em que está. Eles não trazem valor
          nem checklist: isso fica nos{" "}
          <Link href="/processos/modelos" className="font-medium text-accent hover:underline">
            Modelos de tarefa
          </Link>
          .
        </p>
      </div>

      <ServiceTypeManager items={items} workspaces={workspaces} initialWorkspaceId={initialWorkspaceId} />
    </div>
  );
}
