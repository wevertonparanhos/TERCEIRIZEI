import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  STATUS_BADGE_VARIANT,
  PRIORITY_LABELS,
  PRIORITY_BADGE_VARIANT,
  isDemandStale,
} from "@/modules/demands/labels";
import { StatusControl, AssignControl, ConvertToProcessButton } from "@/modules/demands/demand-controls";
import { updateDemandStatus, assignDemand, convertDemandToProcess } from "@/modules/demands/actions";
import { Button } from "@/components/ui/button";

export default async function DemandaDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) redirect("/");

  const demand = await prisma.demand.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      client: { select: { id: true, name: true } },
      company: { select: { razaoSocial: true } },
      serviceType: { select: { name: true } },
      assignedUser: { select: { id: true, name: true } },
      history: { orderBy: { changedAt: "asc" } },
      process: { select: { id: true } },
    },
  });

  if (!demand) notFound();
  if (user.role === "OPERACIONAL" && demand.assignedUserId !== user.id) redirect("/demandas");

  const canManage = user.role === "ADMIN" || user.role === "GESTOR";

  const [staff, historyUsers] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId, role: { name: { in: ["ADMIN", "GESTOR", "OPERACIONAL"] } }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { id: { in: demand.history.map((h) => h.userId).filter((id): id is string => !!id) } },
      select: { id: true, name: true },
    }),
  ]);
  const userNameById = new Map(historyUsers.map((u) => [u.id, u.name]));
  const lastStatusChangeAt = demand.history[demand.history.length - 1]?.changedAt;
  const stale = lastStatusChangeAt ? isDemandStale(demand.status, lastStatusChangeAt) : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Link href="/demandas" className="text-sm text-brand-blue hover:underline">
          ← Voltar para Demandas
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-navy">
            #{demand.number} · {demand.client.name}
          </h1>
          <Badge variant={STATUS_BADGE_VARIANT[demand.status]}>{STATUS_LABELS[demand.status]}</Badge>
          <Badge variant={PRIORITY_BADGE_VARIANT[demand.priority]}>{PRIORITY_LABELS[demand.priority]}</Badge>
          {stale && <Badge variant="danger">Sem movimentação</Badge>}
        </div>
        <p className="text-sm text-slate-500">
          {demand.serviceType.name}
          {demand.company ? ` · ${demand.company.razaoSocial}` : ""} · aberta em{" "}
          {demand.createdAt.toLocaleDateString("pt-BR")}
          {demand.requestedDeadline ? ` · prazo desejado ${demand.requestedDeadline.toLocaleDateString("pt-BR")}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-base font-semibold text-brand-navy">Descrição</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{demand.description}</p>
        {demand.notes && (
          <>
            <h2 className="mb-2 mt-4 text-base font-semibold text-brand-navy">Observações</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{demand.notes}</p>
          </>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-base font-semibold text-brand-navy">Status</h2>
        <StatusControl demandId={demand.id} currentStatus={demand.status} updateStatus={updateDemandStatus} />
      </div>

      {canManage && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-base font-semibold text-brand-navy">Processo</h2>
          {demand.process ? (
            <Link href={`/processos/${demand.process.id}`}>
              <Button variant="outline">Ver processo</Button>
            </Link>
          ) : demand.status === "CANCELADA" ? (
            <p className="text-sm text-slate-400">Demandas canceladas não podem virar processo.</p>
          ) : (
            <ConvertToProcessButton demandId={demand.id} convert={convertDemandToProcess} />
          )}
        </div>
      )}

      {canManage && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-3 text-base font-semibold text-brand-navy">Responsável</h2>
          <AssignControl
            demandId={demand.id}
            currentAssignedUserId={demand.assignedUserId}
            staff={staff}
            assign={assignDemand}
          />
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-3 text-base font-semibold text-brand-navy">Histórico</h2>
        <ul className="space-y-2">
          {demand.history.map((entry) => (
            <li key={entry.id} className="text-sm text-slate-600">
              <span className="font-mono text-xs text-slate-400">
                {entry.changedAt.toLocaleString("pt-BR")}
              </span>{" "}
              — {entry.userId ? userNameById.get(entry.userId) ?? "Sistema" : "Sistema"}{" "}
              {entry.fromStatus ? (
                <>
                  moveu de <b>{STATUS_LABELS[entry.fromStatus]}</b> para{" "}
                </>
              ) : (
                "abriu a demanda como "
              )}
              <b>{STATUS_LABELS[entry.toStatus]}</b>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
