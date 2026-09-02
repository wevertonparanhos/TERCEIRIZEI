import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, PRIORITY_BADGE_VARIANT } from "@/modules/processes/labels";
import { RealtimeRefresh } from "@/modules/portal/realtime-refresh";

export default async function PortalProcessosPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const processes = await prisma.process.findMany({
    where: { clientId: user.clientId },
    include: { serviceType: { select: { name: true } }, stage: { select: { label: true, color: true } } },
    orderBy: { number: "desc" },
  });

  return (
    <div className="p-8">
      <RealtimeRefresh table="processes" filterColumn="client_id" filterValue={user.clientId} />
      <h1 className="text-2xl font-bold text-ink">Meus Processos</h1>
      <p className="text-sm text-muted">{processes.length} processo(s)</p>

      <div className="mt-6 space-y-3">
        {processes.length === 0 && (
          <p className="rounded-lg border border-border bg-surface p-6 text-sm text-muted-soft">
            Nenhum processo em andamento.
          </p>
        )}
        {processes.map((p) => (
          <Link
            key={p.id}
            href={`/portal/processos/${p.id}`}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 hover:shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-ink">
                #{p.number} — {p.serviceType.name}
              </p>
              {p.dueAt && (
                <p className="text-xs text-muted-soft">
                  prazo previsto {p.dueAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
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
