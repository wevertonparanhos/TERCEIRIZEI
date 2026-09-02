import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ENTITY_TYPE_LABELS, ENTITY_TYPE_DOT, relativeTime, groupLogsByDay } from "@/modules/activity/format";

export default async function AtividadesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"].includes(user.role)) redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    where: { tenantId: user.tenantId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const groups = groupLogsByDay(
    logs.map((l) => ({ id: l.id, description: l.description, entityType: l.entityType, createdAt: l.createdAt, userName: l.user?.name ?? null }))
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink">Atividades</h1>
      <p className="text-sm text-muted">O que aconteceu recentemente na conta — últimos {logs.length} eventos.</p>

      {groups.length === 0 && <p className="mt-6 text-sm text-muted-soft">Nenhuma atividade registrada ainda.</p>}

      <div className="mt-6 max-w-2xl space-y-6">
        {groups.map((group) => (
          <div key={group.key}>
            <h2 className="text-sm font-semibold capitalize text-muted-soft">{group.label}</h2>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border bg-surface">
              {group.logs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${ENTITY_TYPE_DOT[log.entityType] ?? "bg-slate-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">{log.description}</p>
                    <p className="mt-0.5 text-xs text-muted-soft">
                      {log.userName ?? "Sistema"} · {ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType} ·{" "}
                      {relativeTime(log.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
