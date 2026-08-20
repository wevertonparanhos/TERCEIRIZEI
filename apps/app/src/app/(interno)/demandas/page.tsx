import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  STATUS_LABELS,
  STATUS_BADGE_VARIANT,
  PRIORITY_LABELS,
  PRIORITY_BADGE_VARIANT,
  isDemandStale,
} from "@/modules/demands/labels";
import { DEMAND_STATUSES, DEMAND_PRIORITIES } from "@/lib/validations/demand";

export default async function DemandasPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) redirect("/");

  const canCreate = user.role === "ADMIN" || user.role === "GESTOR";

  const demands = await prisma.demand.findMany({
    where: {
      tenantId: user.tenantId,
      ...(user.role === "OPERACIONAL" ? { assignedUserId: user.id } : {}),
      ...(searchParams.status ? { status: searchParams.status as never } : {}),
      ...(searchParams.priority ? { priority: searchParams.priority as never } : {}),
    },
    include: {
      client: { select: { name: true } },
      serviceType: { select: { name: true } },
      assignedUser: { select: { name: true } },
      history: { orderBy: { changedAt: "desc" }, take: 1, select: { changedAt: true } },
    },
    orderBy: { number: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Demandas</h1>
          <p className="text-sm text-slate-500">{demands.length} demanda(s)</p>
        </div>
        {canCreate && (
          <Link href="/demandas/nova">
            <Button>+ Nova Demanda</Button>
          </Link>
        )}
      </div>

      <form className="mt-6 flex gap-3" method="get">
        <Select name="status" defaultValue={searchParams.status ?? ""} className="max-w-[220px]">
          <option value="">Todos os status</option>
          {DEMAND_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
        <Select name="priority" defaultValue={searchParams.priority ?? ""} className="max-w-[180px]">
          <option value="">Todas as prioridades</option>
          {DEMAND_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Nº</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Serviço</th>
              <th className="px-4 py-3 font-medium">Prioridade</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {demands.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nenhuma demanda encontrada.
                </td>
              </tr>
            )}
            {demands.map((demand) => (
              <tr key={demand.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">#{demand.number}</td>
                <td className="px-4 py-3">
                  <Link href={`/demandas/${demand.id}`} className="font-medium text-brand-navy hover:underline">
                    {demand.client.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{demand.serviceType.name}</td>
                <td className="px-4 py-3">
                  <Badge variant={PRIORITY_BADGE_VARIANT[demand.priority]}>{PRIORITY_LABELS[demand.priority]}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{demand.assignedUser?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={STATUS_BADGE_VARIANT[demand.status]}>{STATUS_LABELS[demand.status]}</Badge>
                    {demand.history[0] && isDemandStale(demand.status, demand.history[0].changedAt) && (
                      <Badge variant="danger">Sem movimentação</Badge>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
