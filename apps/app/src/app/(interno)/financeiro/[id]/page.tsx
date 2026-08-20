import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_BADGE_VARIANT, displayStatus } from "@/modules/invoices/labels";
import { InvoiceItems } from "@/modules/invoices/invoice-items";
import { MarkPaidForm, CancelInvoiceButton } from "@/modules/invoices/invoice-status-actions";
import { addInvoiceItem, removeInvoiceItem, markInvoicePaid, cancelInvoice } from "@/modules/invoices/actions";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function FaturaDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/");

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      client: { select: { id: true, name: true } },
      company: { select: { razaoSocial: true } },
      createdBy: { select: { name: true } },
      items: { include: { process: { select: { number: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!invoice) notFound();

  const processes = await prisma.process.findMany({
    where: { tenantId: user.tenantId, clientId: invoice.clientId },
    select: { id: true, number: true, description: true },
    orderBy: { number: "desc" },
  });

  const status = displayStatus(invoice.status, invoice.dueDate);
  const canEditItems = invoice.status === "PENDENTE";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Link href="/financeiro" className="text-sm text-brand-blue hover:underline">
          ← Voltar para Financeiro
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-navy">
            #{invoice.number} · {invoice.client.name}
          </h1>
          <Badge variant={STATUS_BADGE_VARIANT[status]}>{STATUS_LABELS[status]}</Badge>
        </div>
        <p className="text-sm text-slate-500">
          {invoice.company ? `${invoice.company.razaoSocial} · ` : ""}
          emitida em {invoice.issueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })} · vencimento{" "}
          {invoice.dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })} · criada por {invoice.createdBy.name}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">Total</h2>
          <span className="font-mono text-lg font-semibold text-brand-navy">
            {currencyFormatter.format(Number(invoice.totalAmount))}
          </span>
        </div>
        {invoice.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{invoice.notes}</p>}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <InvoiceItems
          invoiceId={invoice.id}
          items={invoice.items.map((item) => ({
            id: item.id,
            description: item.description,
            amount: item.amount.toString(),
            process: item.process,
          }))}
          processes={processes}
          canWrite={canEditItems}
          addItem={addInvoiceItem}
          removeItem={removeInvoiceItem}
        />
      </div>

      {invoice.status === "PENDENTE" && (
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-brand-navy">Registrar pagamento</h2>
          <MarkPaidForm invoiceId={invoice.id} markPaid={markInvoicePaid} />
          <div className="border-t border-slate-100 pt-4">
            <CancelInvoiceButton invoiceId={invoice.id} cancel={cancelInvoice} />
          </div>
        </div>
      )}

      {invoice.status === "PAGA" && invoice.paidAt && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-brand-navy">Pagamento</h2>
          <p className="mt-2 text-sm text-slate-600">
            Pago em {invoice.paidAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
            {invoice.paymentMethod ? ` via ${invoice.paymentMethod}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
