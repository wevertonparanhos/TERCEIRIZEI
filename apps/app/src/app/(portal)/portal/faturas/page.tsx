import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { getPaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_BADGE_VARIANT } from "@/modules/processes/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PortalFaturasPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const installments = await prisma.processInstallment.findMany({
    where: { process: { clientId: user.clientId, visibleInPortal: true } },
    orderBy: { paymentDueDate: "asc" },
    include: { process: { select: { number: true, description: true } } },
  });

  const countByProcess = new Map<string, number>();
  for (const i of installments) countByProcess.set(i.processId, (countByProcess.get(i.processId) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-ink">Financeiro</h1>
      <p className="mt-1 text-sm text-muted">Pagamentos das suas demandas com a Terceirizei.</p>

      <div className="mt-6 space-y-3">
        {installments.length === 0 && <p className="text-sm text-muted-soft">Nenhuma cobrança registrada ainda.</p>}
        {installments.map((i) => {
          const status = getPaymentStatus(Number(i.value), i.paymentDueDate, i.paidAt);
          const installmentLabel = (countByProcess.get(i.processId) ?? 0) > 1 ? ` · Parcela ${i.position}` : "";
          return (
            <Link
              key={i.id}
              href={`/portal/processos/${i.processId}`}
              className="block rounded-lg border border-border bg-surface p-5 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-soft">#{i.process.number}{installmentLabel}</span>
                <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-sm text-muted">
                  {i.process.description.slice(0, 60)}
                  {i.paymentDueDate
                    ? ` · vencimento em ${i.paymentDueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
                    : ""}
                  {i.paidAt ? ` · pago em ${i.paidAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
                </p>
                <span className="font-mono text-lg font-semibold text-ink">
                  {currencyFormatter.format(Number(i.value))}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
