import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_BADGE_VARIANT, displayStatus } from "@/modules/invoices/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PortalFaturasPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const invoices = await prisma.invoice.findMany({
    where: { clientId: user.clientId },
    include: { items: true },
    orderBy: { number: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-brand-navy">Faturas</h1>
      <p className="mt-1 text-sm text-slate-500">Cobranças emitidas pela Terceirizei para sua conta.</p>

      <div className="mt-6 space-y-3">
        {invoices.length === 0 && <p className="text-sm text-slate-400">Nenhuma fatura emitida ainda.</p>}
        {invoices.map((invoice) => {
          const status = displayStatus(invoice.status, invoice.dueDate);
          return (
            <div key={invoice.id} className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400">#{invoice.number}</span>
                <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-sm text-slate-600">
                  Vencimento em {invoice.dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  {invoice.status === "PAGA" && invoice.paidAt
                    ? ` · paga em ${invoice.paidAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
                    : ""}
                </p>
                <span className="font-mono text-lg font-semibold text-brand-navy">
                  {currencyFormatter.format(Number(invoice.totalAmount))}
                </span>
              </div>
              {invoice.items.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
                  {invoice.items.map((item) => (
                    <li key={item.id} className="flex justify-between">
                      <span>{item.description}</span>
                      <span className="font-mono">{currencyFormatter.format(Number(item.amount))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
