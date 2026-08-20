import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { BillProcessesForm } from "@/modules/invoices/bill-processes-form";
import { generateInvoiceFromProcesses } from "@/modules/invoices/actions";

export default async function FaturarProcessosPage({
  searchParams,
}: {
  searchParams: { clientId?: string; processId?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/financeiro");

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId, status: "ativo" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  let processes: { id: string; number: number; description: string; value: string }[] = [];
  if (searchParams.clientId) {
    const billed = await prisma.invoiceItem.findMany({
      where: {
        process: { clientId: searchParams.clientId, tenantId: user.tenantId },
        invoice: { status: { not: "CANCELADA" } },
      },
      select: { processId: true },
    });
    const billedIds = new Set(billed.map((b) => b.processId));

    const rows = await prisma.process.findMany({
      where: { tenantId: user.tenantId, clientId: searchParams.clientId, value: { not: null } },
      select: { id: true, number: true, description: true, value: true },
      orderBy: { number: "desc" },
    });

    processes = rows
      .filter((p) => !billedIds.has(p.id))
      .map((p) => ({ id: p.id, number: p.number, description: p.description, value: p.value!.toString() }));
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/financeiro" className="text-sm text-accent hover:underline">
        ← Voltar para Financeiro
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">Faturar Processos</h1>
      <p className="mt-1 text-sm text-muted">
        Gere uma fatura a partir do valor já definido em um ou mais processos do mesmo cliente.
      </p>

      <form method="get" className="mt-6 flex gap-3">
        <Select name="clientId" defaultValue={searchParams.clientId ?? ""}>
          <option value="">Selecione o cliente...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          Ver processos
        </Button>
      </form>

      {searchParams.clientId && (
        <div className="mt-6 rounded-lg border border-border bg-surface p-6">
          {processes.length === 0 ? (
            <p className="text-sm text-muted-soft">
              Nenhum processo com valor definido e sem fatura vinculada para este cliente.
            </p>
          ) : (
            <BillProcessesForm
              processes={processes}
              defaultSelectedId={searchParams.processId}
              generateInvoice={generateInvoiceFromProcesses}
            />
          )}
        </div>
      )}
    </div>
  );
}
