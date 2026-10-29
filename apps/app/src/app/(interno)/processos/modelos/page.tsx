import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { TaskTemplateManager, type TaskTemplateItem } from "@/modules/task-templates/task-template-manager";

export default async function ModelosDeTarefaPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/processos");

  const templates = await prisma.taskTemplate.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    include: { checklist: { orderBy: { position: "asc" }, select: { label: true } } },
  });

  const items: TaskTemplateItem[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    defaultPrice: t.defaultPrice != null ? Number(t.defaultPrice) : null,
    defaultDeadlineDays: t.defaultDeadlineDays,
    defaultPriority: t.defaultPriority,
    defaultNotes: t.defaultNotes ?? "",
    active: t.active,
    checklist: t.checklist.map((c) => c.label),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
      <div>
        <Link href="/processos" className="text-sm text-accent hover:underline">
          ← Voltar para Área de Trabalho
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">Modelos de tarefa</h1>
        <p className="text-sm text-muted">
          Tarefas genéricas pré-prontas que aparecem na <b>Nova Tarefa</b>: valor, prazo, prioridade, anotações e checklist padrão. Mudar um modelo vale para as
          próximas tarefas; as que já existem não mudam. Para as etiquetas que identificam o serviço, veja os{" "}
          <Link href="/processos/tipos" className="font-medium text-accent hover:underline">
            Tipos de solicitação
          </Link>
          .
        </p>
      </div>

      <TaskTemplateManager items={items} />
    </div>
  );
}
