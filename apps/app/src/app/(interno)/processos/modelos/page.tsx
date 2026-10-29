import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ServiceTypeManager, type ServiceTypeItem } from "@/modules/service-types/service-type-manager";

export default async function ModelosDeTarefaPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/processos");

  const types = await prisma.serviceType.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    include: {
      checklistTemplate: { orderBy: { position: "asc" }, select: { label: true } },
      _count: { select: { processes: true } },
    },
  });

  const items: ServiceTypeItem[] = types.map((t) => ({
    id: t.id,
    name: t.name,
    defaultPrice: t.defaultPrice != null ? Number(t.defaultPrice) : null,
    defaultDeadlineDays: t.defaultDeadlineDays,
    defaultPriority: t.defaultPriority,
    defaultNotes: t.defaultNotes ?? "",
    active: t.active,
    checklist: t.checklistTemplate.map((c) => c.label),
    taskCount: t._count.processes,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
      <div>
        <Link href="/processos" className="text-sm text-accent hover:underline">
          ← Voltar para Área de Trabalho
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">Modelos de tarefa</h1>
        <p className="text-sm text-muted">
          Os modelos que aparecem na <b>Nova Tarefa</b> (e as categorias das tarefas). Cada um pode ter valor, prazo, prioridade, anotações e checklist
          padrão. Mudar um modelo vale para as próximas tarefas; as que já existem não mudam.
        </p>
      </div>

      <ServiceTypeManager items={items} />
    </div>
  );
}
