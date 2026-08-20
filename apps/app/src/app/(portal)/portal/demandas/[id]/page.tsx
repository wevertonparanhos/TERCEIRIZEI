import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABELS, STATUS_BADGE_VARIANT } from "@/modules/demands/labels";
import { DemandComments } from "@/modules/demands/demand-comments";
import { clientAddDemandComment } from "@/modules/demands/actions";

export default async function PortalDemandaDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const demand = await prisma.demand.findFirst({
    where: { id: params.id, clientId: user.clientId },
    include: {
      serviceType: { select: { name: true } },
      process: { select: { id: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: { select: { name: true } } } } },
      },
    },
  });

  if (!demand) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Link href="/portal/demandas" className="text-sm text-brand-blue hover:underline">
          ← Voltar para Minhas Demandas
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-navy">
            #{demand.number} — {demand.serviceType.name}
          </h1>
          <Badge variant={STATUS_BADGE_VARIANT[demand.status]}>{STATUS_LABELS[demand.status]}</Badge>
        </div>
        <p className="text-sm text-slate-500">aberta em {demand.createdAt.toLocaleDateString("pt-BR")}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-base font-semibold text-brand-navy">Descrição</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{demand.description}</p>
      </div>

      {demand.process && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-base font-semibold text-brand-navy">Processo</h2>
          <Link href={`/portal/processos/${demand.process.id}`}>
            <Button variant="outline">Ver processo</Button>
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <DemandComments
          demandId={demand.id}
          comments={demand.comments.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            authorName: c.author.name,
            authorIsClient: c.author.role.name === "CLIENTE",
          }))}
          addComment={clientAddDemandComment}
        />
      </div>
    </div>
  );
}
