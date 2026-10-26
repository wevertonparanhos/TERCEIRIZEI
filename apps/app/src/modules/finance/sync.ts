import { prisma } from "@terceirizei/db";

/** Baixa da fatura -> baixa das parcelas: uma fatura paga quita todas as
 * parcelas em aberto das tarefas que ela cobra, com a data da fatura. */
export async function payInstallmentsOfInvoice(invoiceId: string, paidAt: Date): Promise<number> {
  const items = await prisma.invoiceItem.findMany({
    where: { invoiceId, processId: { not: null } },
    select: { processId: true },
  });
  const processIds = items.map((i) => i.processId).filter((id): id is string => !!id);
  if (processIds.length === 0) return 0;

  const result = await prisma.processInstallment.updateMany({
    where: { processId: { in: processIds }, paidAt: null },
    data: { paidAt },
  });
  return result.count;
}

/** Baixa/estorno de parcela -> situação da fatura que cobra a tarefa:
 *  - parcela paga e TODAS as tarefas da fatura quitadas -> fatura vira PAGA
 *    (só se todos os itens têm tarefa; item avulso só existe na fatura);
 *  - parcela estornada e a fatura estava PAGA -> volta para PENDENTE. */
export async function syncInvoicesAfterInstallmentChange(params: {
  tenantId: string;
  processId: string;
  paid: boolean;
}): Promise<void> {
  const { tenantId, processId, paid } = params;

  const invoices = await prisma.invoice.findMany({
    where: { tenantId, status: { not: "CANCELADA" }, items: { some: { processId } } },
    include: { items: { select: { processId: true } } },
  });

  for (const invoice of invoices) {
    if (!paid) {
      if (invoice.status === "PAGA") {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "PENDENTE", paidAt: null, paymentMethod: null },
        });
      }
      continue;
    }

    if (invoice.status !== "PENDENTE") continue;
    if (invoice.items.some((i) => !i.processId)) continue;

    const processIds = invoice.items.map((i) => i.processId as string);
    const openCount = await prisma.processInstallment.count({
      where: { processId: { in: processIds }, paidAt: null },
    });
    if (openCount === 0) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAGA", paidAt: new Date(), paymentMethod: "Baixa das parcelas" },
      });
    }
  }
}
