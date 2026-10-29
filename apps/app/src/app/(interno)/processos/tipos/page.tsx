import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ServiceTypeManager, type ServiceTypeItem } from "@/modules/service-types/service-type-manager";

export default async function TiposDeSolicitacaoPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/processos");

  const types = await prisma.serviceType.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, active: true, processTags: { select: { processId: true } }, _count: { select: { processes: true } } },
  });

  const items: ServiceTypeItem[] = types.map((t) => ({
    id: t.id,
    name: t.name,
    active: t.active,
    taskCount: Math.max(t.processTags.length, t._count.processes),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <div>
        <Link href="/processos" className="text-sm text-accent hover:underline">
          ← Voltar para Área de Trabalho
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">Tipos de solicitação</h1>
        <p className="text-sm text-muted">
          Etiquetas que identificam qual é o serviço da tarefa. Uma tarefa pode ter mais de um tipo. Eles não trazem valor nem checklist: isso fica nos{" "}
          <Link href="/processos/modelos" className="font-medium text-accent hover:underline">
            Modelos de tarefa
          </Link>
          .
        </p>
      </div>

      <ServiceTypeManager items={items} />
    </div>
  );
}
