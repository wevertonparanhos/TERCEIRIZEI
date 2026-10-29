import { prisma } from "@terceirizei/db";
import { summarizePayments, type PaymentSummary } from "@/modules/finance/period";

export type LedgerRow = {
  id: string;
  kind: "parcela" | "fatura";
  processId: string | null;
  invoiceId: string | null;
  number: number | null;
  clientId: string;
  clientName: string;
  title: string;
  installmentLabel: string | null;
  value: number;
  paymentDueDate: Date | null;
  paidAt: Date | null;
};

export type UndatedInstallment = {
  id: string;
  processId: string;
  number: number;
  clientName: string;
  title: string;
  value: number;
  paidAt: Date | null;
};

export type StartLedgerRow = {
  id: string;
  processId: string;
  number: number;
  title: string;
  /** Data de início da tarefa = data em que foi criada. */
  startDate: Date;
  installmentLabel: string | null;
  value: number;
  /** Previsão de pagamento (vencimento da parcela). */
  paymentDueDate: Date | null;
  paidAt: Date | null;
};

/** Hoje no dia de Brasília, como data (meia-noite UTC) — mesma convenção dos vencimentos. */
export function todayBRT(now: Date = new Date()): Date {
  const br = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate()));
}

/** TODAS as parcelas do cliente que não foram pagas até a data de pagamento prevista — de qualquer mês,
 * independente de quando a tarefa foi aberta. Mais antigas primeiro. */
export async function loadOverdueForClient(params: {
  tenantId: string;
  clientId: string;
  today?: Date;
}): Promise<StartLedgerRow[]> {
  const { tenantId, clientId } = params;
  const today = params.today ?? todayBRT();

  const installments = await prisma.processInstallment.findMany({
    where: { paidAt: null, paymentDueDate: { lt: today }, process: { tenantId, clientId } },
    select: {
      id: true,
      position: true,
      value: true,
      paymentDueDate: true,
      paidAt: true,
      process: { select: { id: true, number: true, description: true, createdAt: true, _count: { select: { installments: true } } } },
    },
    orderBy: { paymentDueDate: "asc" },
  });

  return installments.map((i) => ({
    id: i.id,
    processId: i.process.id,
    number: i.process.number,
    title: i.process.description,
    startDate: i.process.createdAt,
    installmentLabel: i.process._count.installments > 1 ? `Parcela ${i.position}` : null,
    value: Number(i.value),
    paymentDueDate: i.paymentDueDate,
    paidAt: i.paidAt,
  }));
}

/** Relatório mensal para enviar ao cliente: as demandas INICIADAS no período
 * (o início é a data de criação da tarefa) com o valor e a previsão de pagamento
 * de cada uma — não importa em que mês cai o vencimento. */
export async function loadStartLedger(params: {
  tenantId: string;
  clientId: string;
  start: Date;
  end: Date;
}): Promise<{ rows: StartLedgerRow[]; summary: PaymentSummary }> {
  const { tenantId, clientId, start, end } = params;
  // O período chega em dias UTC; a data de criação é um instante — alinha ao dia de Brasília (UTC-3),
  // para uma tarefa criada às 22h de 31/10 contar em outubro.
  const BRT_SHIFT = 3 * 60 * 60 * 1000;
  const inRange = { gte: new Date(start.getTime() + BRT_SHIFT), lte: new Date(end.getTime() + BRT_SHIFT) };

  const processes = await prisma.process.findMany({
    where: {
      tenantId,
      clientId,
      createdAt: inRange,
    },
    select: {
      id: true,
      number: true,
      description: true,
      createdAt: true,
      installments: { orderBy: { position: "asc" }, select: { id: true, position: true, value: true, paymentDueDate: true, paidAt: true } },
    },
  });

  const rows: StartLedgerRow[] = processes
    .flatMap((p) =>
      p.installments.map((i) => ({
        id: i.id,
        processId: p.id,
        number: p.number,
        title: p.description,
        startDate: p.createdAt,
        installmentLabel: p.installments.length > 1 ? `Parcela ${i.position}` : null,
        value: Number(i.value),
        paymentDueDate: i.paymentDueDate,
        paidAt: i.paidAt,
      }))
    )
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime() || a.number - b.number);

  return { rows, summary: summarizePayments(rows) };
}

/** Fonte única dos valores financeiros — usada pelo Financeiro geral e pelo
 * relatório por cliente, para os dois sempre baterem.
 *  - parcelas de tarefas com vencimento dentro do período;
 *  - itens de fatura SEM tarefa (só existem na fatura) pelo vencimento da fatura;
 *    itens com tarefa não entram de novo, porque o valor já está nas parcelas
 *    (a baixa da fatura baixa as parcelas — ver markInvoicePaid);
 *  - parcelas sem data de vencimento ficam à parte: não pertencem a nenhum
 *    período, mas o valor não pode sumir silenciosamente. */
export async function loadLedger(params: {
  tenantId: string;
  clientId?: string;
  start: Date;
  end: Date;
}): Promise<{ rows: LedgerRow[]; undated: UndatedInstallment[]; summary: PaymentSummary }> {
  const { tenantId, clientId, start, end } = params;
  const processScope = { tenantId, ...(clientId ? { clientId } : {}) };

  const [installments, undatedRaw, invoiceItems] = await Promise.all([
    prisma.processInstallment.findMany({
      where: { process: processScope, paymentDueDate: { gte: start, lte: end } },
      include: { process: { select: { number: true, description: true, clientId: true, client: { select: { name: true } } } } },
      orderBy: { paymentDueDate: "asc" },
    }),
    prisma.processInstallment.findMany({
      where: { process: processScope, paymentDueDate: null },
      include: { process: { select: { number: true, description: true, client: { select: { name: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invoiceItem.findMany({
      where: {
        processId: null,
        invoice: { tenantId, ...(clientId ? { clientId } : {}), status: { not: "CANCELADA" }, dueDate: { gte: start, lte: end } },
      },
      include: { invoice: { select: { id: true, number: true, clientId: true, dueDate: true, status: true, paidAt: true, client: { select: { name: true } } } } },
      orderBy: { invoice: { dueDate: "asc" } },
    }),
  ]);

  const countByProcess = new Map<string, number>();
  for (const i of installments) countByProcess.set(i.processId, (countByProcess.get(i.processId) ?? 0) + 1);

  const parcelaRows: LedgerRow[] = installments.map((i) => ({
    id: i.id,
    kind: "parcela",
    processId: i.processId,
    invoiceId: null,
    number: i.process.number,
    clientId: i.process.clientId,
    clientName: i.process.client.name,
    title: i.process.description,
    installmentLabel: (countByProcess.get(i.processId) ?? 0) > 1 ? `Parcela ${i.position}` : null,
    value: Number(i.value),
    paymentDueDate: i.paymentDueDate,
    paidAt: i.paidAt,
  }));

  const faturaRows: LedgerRow[] = invoiceItems.map((it) => ({
    id: it.id,
    kind: "fatura",
    processId: null,
    invoiceId: it.invoice.id,
    number: it.invoice.number,
    clientId: it.invoice.clientId,
    clientName: it.invoice.client.name,
    title: it.description,
    installmentLabel: `Fatura #${it.invoice.number}`,
    value: Number(it.amount),
    paymentDueDate: it.invoice.dueDate,
    paidAt: it.invoice.status === "PAGA" ? (it.invoice.paidAt ?? it.invoice.dueDate) : null,
  }));

  const rows = [...parcelaRows, ...faturaRows].sort(
    (a, b) => (a.paymentDueDate?.getTime() ?? 0) - (b.paymentDueDate?.getTime() ?? 0)
  );

  const undated: UndatedInstallment[] = undatedRaw.map((i) => ({
    id: i.id,
    processId: i.processId,
    number: i.process.number,
    clientName: i.process.client.name,
    title: i.process.description,
    value: Number(i.value),
    paidAt: i.paidAt,
  }));

  return { rows, undated, summary: summarizePayments(rows) };
}
