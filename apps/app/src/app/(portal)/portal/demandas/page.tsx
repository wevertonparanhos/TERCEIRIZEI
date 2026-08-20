import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_BADGE_VARIANT } from "@/modules/demands/labels";

export default async function PortalDemandasPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const demands = await prisma.demand.findMany({
    where: { clientId: user.clientId },
    include: { serviceType: { select: { name: true } } },
    orderBy: { number: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-navy">Minhas Demandas</h1>
        <Link href="/portal/nova-demanda">
          <Button>+ Nova Demanda</Button>
        </Link>
      </div>

      <div className="mt-6 space-y-2">
        {demands.length === 0 && (
          <p className="text-sm text-slate-400">Nenhuma demanda registrada ainda.</p>
        )}
        {demands.map((demand) => (
          <Link
            key={demand.id}
            href={`/portal/demandas/${demand.id}`}
            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm"
          >
            <div>
              <p className="text-sm font-medium text-brand-navy">
                #{demand.number} — {demand.serviceType.name}
              </p>
              <p className="text-xs text-slate-400">{demand.createdAt.toLocaleDateString("pt-BR")}</p>
            </div>
            <Badge variant={STATUS_BADGE_VARIANT[demand.status]}>{STATUS_LABELS[demand.status]}</Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
