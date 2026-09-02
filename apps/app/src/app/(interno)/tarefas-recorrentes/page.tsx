import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { RecurringTasksBoard } from "@/modules/recurring-tasks/recurring-tasks-board";
import {
  createRecurringTask,
  completeRecurringTaskOccurrence,
  deactivateRecurringTask,
  reactivateRecurringTask,
} from "@/modules/recurring-tasks/actions";

export default async function TarefasRecorrentesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) redirect("/dashboard");

  const canManage = user.role === "ADMIN" || user.role === "GESTOR";

  const [clients, staff, tasks] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId: user.tenantId, status: "ativo" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { tenantId: user.tenantId, role: { name: { in: ["ADMIN", "GESTOR", "OPERACIONAL"] } }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.recurringTask.findMany({
      where: {
        tenantId: user.tenantId,
        ...(user.role === "OPERACIONAL" ? { assigneeId: user.id } : {}),
      },
      include: { client: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: [{ active: "desc" }, { nextDueAt: "asc" }],
    }),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink">Tarefas Recorrentes</h1>
      <p className="mt-1 text-sm text-muted">
        Obrigações que se repetem com um cliente (ex.: envio mensal de relatório) — acompanhe tudo aqui sem precisar
        entrar em cada cliente.
      </p>

      <div className="mt-6">
        <RecurringTasksBoard
          clients={clients}
          staff={staff}
          canManage={canManage}
          tasks={tasks.map((t) => ({
            id: t.id,
            clientId: t.clientId,
            clientName: t.client.name,
            title: t.title,
            frequency: t.frequency,
            nextDueAt: t.nextDueAt.toISOString(),
            active: t.active,
            assigneeName: t.assignee?.name ?? null,
          }))}
          createTask={createRecurringTask}
          completeOccurrence={completeRecurringTaskOccurrence}
          deactivateTask={deactivateRecurringTask}
          reactivateTask={reactivateRecurringTask}
        />
      </div>
    </div>
  );
}
