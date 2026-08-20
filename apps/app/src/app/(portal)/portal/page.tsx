import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { STATUS_LABELS as DEMAND_STATUS_LABELS } from "@/modules/demands/labels";
import { displayStatus } from "@/modules/invoices/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PortalDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const [activeProcesses, pendingRequests, openDemands, openInvoices] = await Promise.all([
    prisma.process.count({
      where: { clientId: user.clientId, stage: { label: { notIn: ["Concluído", "Cancelado"] } } },
    }),
    prisma.documentRequest.count({ where: { clientId: user.clientId, status: "PENDENTE" } }),
    prisma.demand.count({
      where: { clientId: user.clientId, status: { notIn: ["CONCLUIDA", "CANCELADA"] } },
    }),
    prisma.invoice.findMany({ where: { clientId: user.clientId, status: "PENDENTE" } }),
  ]);

  const overdueCount = openInvoices.filter((i) => displayStatus(i.status, i.dueDate) === "ATRASADA").length;
  const openTotal = openInvoices.reduce((sum, i) => sum + Number(i.totalAmount), 0);

  const recentDemands = await prisma.demand.findMany({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { serviceType: { select: { name: true } } },
  });

  return (
    <div className="p-8">
      <p className="text-sm text-slate-500">Bem-vindo(a),</p>
      <h1 className="mt-1 text-2xl font-bold text-brand-navy">{user.name}</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Link href="/portal/processos" className="rounded-lg border border-slate-200 bg-white p-5 hover:shadow-sm">
          <p className="text-2xl font-bold text-brand-navy">{activeProcesses}</p>
          <p className="text-sm text-slate-500">Processos em andamento</p>
        </Link>
        <Link href="/portal/documentos" className="rounded-lg border border-slate-200 bg-white p-5 hover:shadow-sm">
          <p className="text-2xl font-bold text-brand-navy">{pendingRequests}</p>
          <p className="text-sm text-slate-500">Documentos pendentes</p>
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-2xl font-bold text-brand-navy">{openDemands}</p>
          <p className="text-sm text-slate-500">Demandas em aberto</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">Demandas recentes</h2>
          <Link href="/portal/nova-demanda" className="text-sm text-brand-blue hover:underline">
            + Nova Demanda
          </Link>
        </div>
        {recentDemands.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Nenhuma demanda registrada ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recentDemands.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/portal/demandas/${d.id}`}
                  className="flex items-center justify-between py-2.5 text-sm hover:text-brand-navy"
                >
                  <span className="text-slate-700">
                    #{d.number} — {d.serviceType.name}
                  </span>
                  <span className="text-xs text-slate-400">{DEMAND_STATUS_LABELS[d.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/portal/faturas" className="mt-6 block rounded-lg border border-slate-200 bg-white p-6 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">Financeiro</h2>
          <span className="text-sm text-brand-blue hover:underline">Ver faturas →</span>
        </div>
        {openInvoices.length === 0 ? (
          <p className="mt-2 text-sm text-slate-400">Nenhuma fatura pendente no momento.</p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            {openInvoices.length} fatura(s) pendente(s) · {currencyFormatter.format(openTotal)}
            {overdueCount > 0 && <span className="ml-2 text-red-600">{overdueCount} atrasada(s)</span>}
          </p>
        )}
      </Link>
    </div>
  );
}
