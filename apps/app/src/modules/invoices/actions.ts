"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  invoiceSchema,
  invoiceItemSchema,
  markPaidSchema,
  generateInvoiceSchema,
  type InvoiceInput,
  type InvoiceItemInput,
  type MarkPaidInput,
  type GenerateInvoiceInput,
} from "@/lib/validations/invoice";

// A conexão do Prisma bypassa RLS (role postgres) — tenant_id explícito em todo
// where/data abaixo é a real fronteira de isolamento nesta camada.
async function requireFinanceAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) {
    throw new Error("Você não tem acesso ao módulo financeiro.");
  }
  return user;
}

async function nextInvoiceNumber(tenantId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    insert into tenant_counters (tenant_id, key, value)
    values (${tenantId}::uuid, 'invoice', 1)
    on conflict (tenant_id, key) do update set value = tenant_counters.value + 1
    returning value
  `;
  return rows[0].value;
}

export async function createInvoice(input: InvoiceInput) {
  const user = await requireFinanceAccess();
  const data = invoiceSchema.parse(input);

  const client = await prisma.client.findFirst({ where: { id: data.clientId, tenantId: user.tenantId } });
  if (!client) throw new Error("Cliente não encontrado.");

  if (data.companyId) {
    const company = await prisma.company.findFirst({ where: { id: data.companyId, clientId: data.clientId } });
    if (!company) throw new Error("Empresa não encontrada.");
  }

  const number = await nextInvoiceNumber(user.tenantId);

  const invoice = await prisma.invoice.create({
    data: {
      tenantId: user.tenantId,
      number,
      clientId: data.clientId,
      companyId: data.companyId || null,
      dueDate: new Date(data.dueDate),
      totalAmount: 0,
      notes: data.notes || null,
      createdById: user.id,
    },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "invoice.create",
    entityType: "invoice",
    entityId: invoice.id,
    description: `Fatura #${invoice.number} criada.`,
  });

  revalidatePath("/financeiro");
  return { id: invoice.id };
}

async function recalculateTotal(invoiceId: string) {
  const items = await prisma.invoiceItem.findMany({ where: { invoiceId } });
  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount), 0);
  await prisma.invoice.update({ where: { id: invoiceId }, data: { totalAmount } });
}

export async function addInvoiceItem(invoiceId: string, input: InvoiceItemInput) {
  const user = await requireFinanceAccess();
  const data = invoiceItemSchema.parse(input);

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId } });
  if (!invoice) throw new Error("Fatura não encontrada.");
  if (invoice.status !== "PENDENTE") throw new Error("Só é possível editar itens de uma fatura pendente.");

  if (data.processId) {
    const process = await prisma.process.findFirst({ where: { id: data.processId, clientId: invoice.clientId } });
    if (!process) throw new Error("Processo não encontrado.");
  }

  await prisma.invoiceItem.create({
    data: {
      invoiceId,
      description: data.description,
      amount: data.amount,
      processId: data.processId || null,
    },
  });
  await recalculateTotal(invoiceId);

  revalidatePath(`/financeiro/${invoiceId}`);
}

export async function removeInvoiceItem(itemId: string) {
  const user = await requireFinanceAccess();

  const item = await prisma.invoiceItem.findFirst({
    where: { id: itemId, invoice: { tenantId: user.tenantId } },
    include: { invoice: true },
  });
  if (!item) throw new Error("Item não encontrado.");
  if (item.invoice.status !== "PENDENTE") throw new Error("Só é possível editar itens de uma fatura pendente.");

  await prisma.invoiceItem.delete({ where: { id: itemId } });
  await recalculateTotal(item.invoiceId);

  revalidatePath(`/financeiro/${item.invoiceId}`);
}

export async function markInvoicePaid(invoiceId: string, input: MarkPaidInput) {
  const user = await requireFinanceAccess();
  const data = markPaidSchema.parse(input);

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId } });
  if (!invoice) throw new Error("Fatura não encontrada.");
  if (invoice.status !== "PENDENTE") throw new Error("Só é possível marcar como paga uma fatura pendente.");

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAGA",
      paidAt: new Date(data.paidAt),
      paymentMethod: data.paymentMethod,
      notes: data.notes ? `${invoice.notes ? `${invoice.notes}\n` : ""}${data.notes}` : invoice.notes,
    },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "invoice.mark_paid",
    entityType: "invoice",
    entityId: invoiceId,
    description: `Fatura #${invoice.number} marcada como paga (${data.paymentMethod}).`,
    metadata: { paymentMethod: data.paymentMethod, totalAmount: invoice.totalAmount.toString() },
  });

  revalidatePath(`/financeiro/${invoiceId}`);
  revalidatePath("/financeiro");
}

/** Gera fatura(s) a partir do valor já definido em processos — uma fatura
 * agrupando vários processos do mesmo cliente, ou uma fatura por processo. */
export async function generateInvoiceFromProcesses(input: GenerateInvoiceInput) {
  const user = await requireFinanceAccess();
  const data = generateInvoiceSchema.parse(input);

  const processes = await prisma.process.findMany({
    where: { id: { in: data.processIds }, tenantId: user.tenantId },
  });
  if (processes.length !== data.processIds.length) {
    throw new Error("Um ou mais processos não foram encontrados.");
  }
  if (processes.some((p) => p.value === null)) {
    throw new Error("Todos os processos selecionados precisam ter um valor definido.");
  }

  const clientIds = new Set(processes.map((p) => p.clientId));
  if (data.grouped && clientIds.size > 1) {
    throw new Error("Só é possível agrupar em uma única fatura processos do mesmo cliente.");
  }

  const alreadyBilled = await prisma.invoiceItem.findMany({
    where: { processId: { in: data.processIds }, invoice: { status: { not: "CANCELADA" } } },
    select: { processId: true },
  });
  if (alreadyBilled.length > 0) {
    throw new Error("Um ou mais processos selecionados já têm fatura vinculada.");
  }

  const dueDate = new Date(data.dueDate);
  const invoiceIds: string[] = [];

  if (data.grouped) {
    const [{ clientId, companyId }] = processes;
    const number = await nextInvoiceNumber(user.tenantId);
    const invoice = await prisma.invoice.create({
      data: {
        tenantId: user.tenantId,
        number,
        clientId,
        companyId: companyId ?? null,
        dueDate,
        totalAmount: 0,
        createdById: user.id,
      },
    });
    await prisma.invoiceItem.createMany({
      data: processes.map((p) => ({
        invoiceId: invoice.id,
        processId: p.id,
        description: `Processo #${p.number} — ${p.description.slice(0, 80)}`,
        amount: p.value!,
      })),
    });
    await recalculateTotal(invoice.id);
    invoiceIds.push(invoice.id);
  } else {
    for (const p of processes) {
      const number = await nextInvoiceNumber(user.tenantId);
      const invoice = await prisma.invoice.create({
        data: {
          tenantId: user.tenantId,
          number,
          clientId: p.clientId,
          companyId: p.companyId ?? null,
          dueDate,
          totalAmount: p.value!,
          createdById: user.id,
        },
      });
      await prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          processId: p.id,
          description: `Processo #${p.number} — ${p.description.slice(0, 80)}`,
          amount: p.value!,
        },
      });
      invoiceIds.push(invoice.id);
    }
  }

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "invoice.generate_from_processes",
    entityType: "invoice",
    entityId: invoiceIds[0],
    description: `${invoiceIds.length} fatura(s) gerada(s) a partir de ${processes.length} processo(s).`,
    metadata: { processIds: data.processIds, grouped: data.grouped },
  });

  revalidatePath("/financeiro");
  return { ids: invoiceIds };
}

export async function cancelInvoice(invoiceId: string) {
  const user = await requireFinanceAccess();

  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId: user.tenantId } });
  if (!invoice) throw new Error("Fatura não encontrada.");
  if (invoice.status === "PAGA") throw new Error("Não é possível cancelar uma fatura já paga.");

  await prisma.invoice.update({ where: { id: invoiceId }, data: { status: "CANCELADA" } });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "invoice.cancel",
    entityType: "invoice",
    entityId: invoiceId,
    description: `Fatura #${invoice.number} cancelada.`,
  });

  revalidatePath(`/financeiro/${invoiceId}`);
  revalidatePath("/financeiro");
}
