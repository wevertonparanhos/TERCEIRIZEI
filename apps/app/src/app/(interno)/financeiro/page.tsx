import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { STATUS_LABELS, STATUS_BADGE_VARIANT, displayStatus } from "@/modules/invoices/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function FinanceiroPage({ searchParams }: { searchParams: { status?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/");

  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId: user.tenantId,
      ...(searchParams.status ? { status: searchParams.status as never } : {}),
    },
    include: { client: { select: { name: true } } },
    orderBy: { number: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Financeiro</h1>
          <p className="text-sm text-slate-500">{invoices.length} fatura(s)</p>
        </div>
        <div className="flex gap-2">
          <Link href="/financeiro/faturar">
            <Button variant="outline">Faturar Processos</Button>
          </Link>
          <Link href="/financeiro/nova">
            <Button>+ Nova Fatura</Button>
          </Link>
        </div>
      </div>

      <form className="mt-6 flex gap-3" method="get">
        <Select name="status" defaultValue={searchParams.status ?? ""} className="max-w-[220px]">
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="PAGA">Paga</option>
          <option value="CANCELADA">Cancelada</option>
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
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  Nenhuma fatura encontrada.
                </td>
              </tr>
            )}
            {invoices.map((invoice) => {
              const status = displayStatus(invoice.status, invoice.dueDate);
              return (
                <tr key={invoice.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">#{invoice.number}</td>
                  <td className="px-4 py-3">
                    <Link href={`/financeiro/${invoice.id}`} className="font-medium text-brand-navy hover:underline">
                      {invoice.client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {invoice.dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600">
                    {currencyFormatter.format(Number(invoice.totalAmount))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
