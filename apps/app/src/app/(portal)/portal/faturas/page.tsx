import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { getPaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_BADGE_VARIANT } from "@/modules/processes/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PortalFaturasPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const processes = await prisma.process.findMany({
    where: { clientId: user.clientId, visibleInPortal: true, value: { not: null } },
    orderBy: { paymentDueDate: "asc" },
    select: { id: true, number: true, description: true, value: true, paymentDueDate: true, paidAt: true },
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-ink">Financeiro</h1>
      <p className="mt-1 text-sm text-muted">Pagamentos das suas demandas com a Terceirizei.</p>

      <div className="mt-6 space-y-3">
        {processes.length === 0 && <p className="text-sm text-muted-soft">Nenhuma cobrança registrada ainda.</p>}
        {processes.map((p) => {
          const status = getPaymentStatus(Number(p.value), p.paymentDueDate, p.paidAt);
          return (
            <Link
              key={p.id}
              href={`/portal/processos/${p.id}`}
              className="block rounded-lg border border-border bg-surface p-5 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-soft">#{p.number}</span>
                <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-sm text-muted">
                  {p.description.slice(0, 60)}
                  {p.paymentDueDate
                    ? ` · vencimento em ${p.paymentDueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
                    : ""}
                  {p.paidAt ? ` · pago em ${p.paidAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
                </p>
                <span className="font-mono text-lg font-semibold text-ink">
                  {currencyFormatter.format(Number(p.value))}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
