import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { InvoiceForm } from "@/modules/invoices/invoice-form";
import { createInvoice } from "@/modules/invoices/actions";

export default async function NovaFaturaPage({ searchParams }: { searchParams: { processId?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/financeiro");

  const [clients, companies, sourceProcess] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId: user.tenantId, status: "ativo" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, clientId: true, razaoSocial: true },
    }),
    searchParams.processId
      ? prisma.process.findFirst({
          where: { id: searchParams.processId, tenantId: user.tenantId },
          select: { clientId: true, companyId: true },
        })
      : null,
  ]);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/financeiro" className="text-sm text-accent hover:underline">
        ← Voltar para Financeiro
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">Nova Fatura</h1>
      {sourceProcess && (
        <p className="mt-1 text-sm text-muted">
          Cliente pré-preenchido a partir do processo. Adicione os itens da cobrança depois de criar a fatura.
        </p>
      )}

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <InvoiceForm
          clients={clients}
          companies={companies}
          defaultValues={
            sourceProcess
              ? { clientId: sourceProcess.clientId, companyId: sourceProcess.companyId ?? "" }
              : undefined
          }
          onSubmit={createInvoice}
        />
      </div>
    </div>
  );
}
