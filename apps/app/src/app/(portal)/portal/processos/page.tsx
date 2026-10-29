import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, PRIORITY_BADGE_VARIANT } from "@/modules/processes/labels";
import { RealtimeRefresh } from "@/modules/portal/realtime-refresh";
import { taskProgress } from "@/modules/portal/progress";

export default async function PortalProcessosPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const [processes, requests] = await Promise.all([
    prisma.process.findMany({
      where: { clientId: user.clientId, visibleInPortal: true },
      include: { serviceType: { select: { name: true } }, stage: { select: { label: true, color: true } } },
      orderBy: { number: "desc" },
    }),
    // Pedidos ainda sem resposta ou recusados (os aceitos já aparecem como tarefa).
    prisma.portalRequest.findMany({
      where: { clientId: user.clientId, status: { in: ["PENDENTE", "RECUSADO"] } },
      include: { serviceType: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

 // Etapas dos quadros das tarefas listadas, para calcular o % de conclusão.
  const stages = await prisma.kanbanStage.findMany({
    where: { workspaceId: { in: Array.from(new Set(processes.map((p) => p.workspaceId))) } },
    select: { id: true, workspaceId: true, label: true, position: true },
  });
  const progressOf = (p: (typeof processes)[number]) => taskProgress(stages.filter((s) => s.workspaceId === p.workspaceId), p.stageId);

  return (
    <div className="p-4 sm:p-8">
      <RealtimeRefresh table="processes" filterColumn="client_id" filterValue={user.clientId} />
      <h1 className="text-2xl font-bold text-ink">Minhas Tarefas</h1>
      <p className="text-sm text-muted">{processes.length} tarefa(s)</p>

      {requests.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-ink">Pedidos enviados</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-ink">{r.serviceType.name}</p>
                  <Badge variant={r.status === "PENDENTE" ? "warning" : "danger"}>{r.status === "PENDENTE" ? "Em análise" : "Recusado"}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{r.description}</p>
                {r.status === "RECUSADO" && r.reviewNote && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300">Motivo: {r.reviewNote}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 space-y-3">
        {processes.length === 0 && (
          <p className="rounded-2xl border border-border/70 bg-surface shadow-sm p-6 text-sm text-muted-soft">
            Nenhuma tarefa em andamento.
          </p>
        )}
        {processes.map((p) => (
          <Link
            key={p.id}
            href={`/portal/processos/${p.id}`}
            className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">
                #{p.number} — {p.description}
              </p>
              <p className="text-xs text-muted-soft">{p.serviceType.name}</p>
              {p.dueAt && (
                <p className="text-xs text-muted-soft">
                  prazo previsto {p.dueAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </p>
              )}
              {progressOf(p).paused ? (
                <p className="mt-2 text-[11px] font-semibold text-amber-600">Em pausa · {progressOf(p).pauseLabel}</p>
              ) : (
                <div className="mt-2 flex items-center gap-2" aria-label={`Progresso ${progressOf(p).percent}%`}>
                  <div className="h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-border">
                    <div className={`h-full rounded-full ${progressOf(p).finished ? "bg-emerald-500" : "bg-accent"}`} style={{ width: `${progressOf(p).percent}%` }} />
                  </div>
                  <span className="text-[11px] font-semibold text-muted">{progressOf(p).percent}%</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={PRIORITY_BADGE_VARIANT[p.priority]}>{PRIORITY_LABELS[p.priority]}</Badge>
              <Badge variant="info" style={{ backgroundColor: `${p.stage.color}1A`, color: p.stage.color }}>
                {p.stage.label}
              </Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
