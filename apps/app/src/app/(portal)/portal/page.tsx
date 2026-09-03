import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { PRIORITY_LABELS, getPaymentStatus } from "@/modules/processes/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PortalDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const [activeProcesses, pendingRequests, unpaidProcesses] = await Promise.all([
    prisma.process.count({
      where: { clientId: user.clientId, visibleInPortal: true, stage: { label: { notIn: ["Concluído", "Cancelado"] } } },
    }),
    prisma.documentRequest.count({ where: { clientId: user.clientId, status: "PENDENTE" } }),
    prisma.processInstallment.findMany({
      where: { process: { clientId: user.clientId, visibleInPortal: true }, paidAt: null },
      select: { value: true, paymentDueDate: true, paidAt: true },
    }),
  ]);

  const overdueCount = unpaidProcesses.filter(
    (p) => getPaymentStatus(Number(p.value), p.paymentDueDate, p.paidAt) === "ATRASADO"
  ).length;
  const openTotal = unpaidProcesses.reduce((sum, p) => sum + Number(p.value), 0);
  const upcomingCount = unpaidProcesses.length - overdueCount;

  const recentProcesses = await prisma.process.findMany({
    where: { clientId: user.clientId, visibleInPortal: true },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { serviceType: { select: { name: true } }, stage: { select: { label: true, color: true } } },
  });

  return (
    <div className="p-8">
      <p className="text-sm text-muted">Bem-vindo(a),</p>
      <h1 className="mt-1 text-2xl font-bold text-ink">{user.name}</h1>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Link href="/portal/processos" className="rounded-lg border border-border bg-surface p-5 hover:shadow-sm">
          <p className="text-2xl font-bold text-ink">{activeProcesses}</p>
          <p className="text-sm text-muted">Processos em andamento</p>
        </Link>
        <Link href="/portal/documentos" className="rounded-lg border border-border bg-surface p-5 hover:shadow-sm">
          <p className="text-2xl font-bold text-ink">{pendingRequests}</p>
          <p className="text-sm text-muted">Documentos pendentes</p>
        </Link>
        <Link href="/portal/faturas" className="rounded-lg border border-border bg-surface p-5 hover:shadow-sm">
          <p className="text-2xl font-bold text-ink">{unpaidProcesses.length}</p>
          <p className="text-sm text-muted">Pagamentos pendentes</p>
        </Link>
      </div>

      <div className="mt-8 rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Demandas recentes</h2>
          <Link href="/portal/nova-demanda" className="text-sm text-accent hover:underline">
            + Nova Demanda
          </Link>
        </div>
        {recentProcesses.length === 0 ? (
          <p className="mt-3 text-sm text-muted-soft">Nenhuma demanda registrada ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recentProcesses.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/portal/processos/${p.id}`}
                  className="flex items-center justify-between py-2.5 text-sm hover:text-ink"
                >
                  <span className="text-ink">
                    #{p.number} — {p.serviceType.name}
                    <span className="ml-2 text-xs text-muted-soft">{PRIORITY_LABELS[p.priority]}</span>
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs"
                    style={{ backgroundColor: `${p.stage.color}1A`, color: p.stage.color }}
                  >
                    {p.stage.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Link href="/portal/faturas" className="mt-6 block rounded-lg border border-border bg-surface p-6 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Financeiro</h2>
          <span className="text-sm text-accent hover:underline">Ver detalhes →</span>
        </div>
        {unpaidProcesses.length === 0 ? (
          <p className="mt-2 text-sm text-muted-soft">Nenhum pagamento pendente no momento.</p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {unpaidProcesses.length} pagamento(s) pendente(s) · {currencyFormatter.format(openTotal)}
            {overdueCount > 0 && <span className="ml-2 text-red-600">{overdueCount} atrasado(s)</span>}
            {upcomingCount > 0 && <span className="ml-2 text-muted-soft">{upcomingCount} dentro do prazo</span>}
          </p>
        )}
      </Link>
    </div>
  );
}
