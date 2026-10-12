import Link from "next/link";
import type { PaymentStatus, PayoutStatus } from "@prisma/client";
import { ActionForm } from "@/components/action-form";
import { buttonClass } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Badge, Card, EmptyState, Notice, PageHeader, type BadgeTone } from "@/components/ui/surface";
import { STATUS_LABEL } from "@/domain/booking-state";
import { formatBRL } from "@/domain/money";
import { cn, formatDateTime } from "@/lib/utils";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";
import { activeGateway } from "@/server/payments";
import { adminRefundAction, reconcilePaymentsAction, releasePayoutAction, resolveDisputeCompletedAction } from "../actions";

const PAY: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Pendente", tone: "warning" },
  APPROVED: { label: "Aprovado", tone: "success" },
  DECLINED: { label: "Recusado", tone: "danger" },
  EXPIRED: { label: "Expirado", tone: "neutral" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
  REFUNDED: { label: "Estornado", tone: "neutral" },
  PARTIALLY_REFUNDED: { label: "Estorno parcial", tone: "warning" },
  CHARGEBACK: { label: "Contestação", tone: "danger" },
};
const PAYOUT: Record<PayoutStatus, { label: string; tone: BadgeTone }> = {
  ON_HOLD: { label: "Retido", tone: "warning" },
  SCHEDULED: { label: "Liberado", tone: "brand" },
  PAID: { label: "Pago", tone: "success" },
  FAILED: { label: "Falhou", tone: "danger" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};
const TABS = { resumo: "Resumo", pagamentos: "Pagamentos", repasses: "Repasses", mediacao: "Mediação", reembolsos: "Reembolsos" } as const;

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const actor = await requirePagePermission("admin:finance:read", "/admin/financeiro");
  const { aba } = await searchParams;
  const tab = (aba && aba in TABS ? aba : "resumo") as keyof typeof TABS;
  const simulated = activeGateway().isSimulated;

  const [approved, commissions, refundsSum, payoutsBy] = await Promise.all([
    db.paymentTransaction.aggregate({ where: { status: { in: ["APPROVED", "PARTIALLY_REFUNDED", "REFUNDED"] } }, _sum: { amountCents: true, feeCents: true }, _count: true }),
    db.platformCommission.aggregate({ where: { reversedAt: null }, _sum: { amountCents: true } }),
    db.refund.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountCents: true } }),
    db.providerPayout.groupBy({ by: ["status"], _sum: { netCents: true }, _count: true }),
  ]);
  const payoutSum = (s: PayoutStatus) => payoutsBy.find((p) => p.status === s)?._sum.netCents ?? 0;

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Pagamentos, comissões, repasses e reembolsos. Toda operação fica na auditoria."
        actions={<a href="/admin/financeiro/exportar" className={buttonClass("secondary", "sm")}>Exportar CSV</a>}
      />
      {simulated ? <div className="mb-5"><Notice tone="warning" title="Provedor em modo SIMULAÇÃO">Nenhum valor desta tela é dinheiro real.</Notice></div> : null}

      <div className="mb-5 flex flex-wrap gap-2">
        {Object.entries(TABS).map(([k, label]) => (
          <Link key={k} href={`/admin/financeiro?aba=${k}`} className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", k === tab ? "bg-ink text-white" : "bg-surface text-ink-soft ring-1 ring-line")}>{label}</Link>
        ))}
      </div>

      {tab === "resumo" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-5"><p className="text-sm text-muted">Recebido de clientes</p><p className="mt-1 text-2xl font-bold">{formatBRL(approved._sum.amountCents ?? 0)}</p><p className="text-xs text-muted">{approved._count} pagamento(s)</p></Card>
            <Card className="p-5"><p className="text-sm text-muted">Comissões (líquidas de estornos)</p><p className="mt-1 text-2xl font-bold text-brand">{formatBRL(commissions._sum.amountCents ?? 0)}</p></Card>
            <Card className="p-5"><p className="text-sm text-muted">Reembolsado</p><p className="mt-1 text-2xl font-bold">{formatBRL(refundsSum._sum.amountCents ?? 0)}</p></Card>
            <Card className="p-5"><p className="text-sm text-muted">Repasses retidos (serviço não concluído)</p><p className="mt-1 text-2xl font-bold">{formatBRL(payoutSum("ON_HOLD"))}</p></Card>
            <Card className="p-5"><p className="text-sm text-muted">Repasses liberados a pagar</p><p className="mt-1 text-2xl font-bold">{formatBRL(payoutSum("SCHEDULED"))}</p></Card>
            <Card className="p-5"><p className="text-sm text-muted">Repasses pagos</p><p className="mt-1 text-2xl font-bold">{formatBRL(payoutSum("PAID"))}</p></Card>
          </div>
          <Card className="mt-6 p-5">
            <h2 className="font-semibold">Conciliação</h2>
            <p className="mt-1 text-sm text-muted">Reconsulta no provedor todas as cobranças pendentes e aplica o status oficial (recupera webhooks perdidos).</p>
            <ActionForm action={reconcilePaymentsAction} submitLabel="Conciliar agora" variant="secondary" className="mt-3" />
          </Card>
        </>
      ) : null}

      {tab === "pagamentos" ? <PaymentsTab /> : null}
      {tab === "repasses" ? <PayoutsTab canRelease={actor.role === "ADMIN"} /> : null}
      {tab === "mediacao" ? <DisputesTab /> : null}
      {tab === "reembolsos" ? <RefundsTab /> : null}
    </>
  );
}

async function PaymentsTab() {
  const payments = await db.paymentTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { booking: { select: { code: true, status: true } } } });
  if (payments.length === 0) return <EmptyState title="Nenhum pagamento ainda" />;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="text-left text-muted"><tr className="border-b border-line"><th className="p-3 font-medium">Quando</th><th className="p-3 font-medium">Pedido</th><th className="p-3 font-medium">Método</th><th className="p-3 font-medium">Valor</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Provedor</th></tr></thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id} className="border-b border-line last:border-0">
              <td className="p-3 text-muted">{formatDateTime(p.createdAt)}</td>
              <td className="p-3">{p.booking.code}<span className="block text-xs text-muted">{STATUS_LABEL[p.booking.status]}</span></td>
              <td className="p-3">{p.method === "PIX" ? "PIX" : "Cartão"}</td>
              <td className="p-3 font-medium">{formatBRL(p.amountCents)}</td>
              <td className="p-3"><Badge tone={PAY[p.status].tone}>{PAY[p.status].label}</Badge></td>
              <td className="p-3 text-xs text-muted">{p.provider}{p.isSimulated ? " (SIMULADO)" : ""}<span className="block">{p.providerPaymentId}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

async function PayoutsTab({ canRelease }: { canRelease: boolean }) {
  const payouts = await db.providerPayout.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { provider: { select: { displayName: true } }, booking: { select: { code: true, status: true } } },
  });
  if (payouts.length === 0) return <EmptyState title="Nenhum repasse ainda" />;
  return (
    <Card className="divide-y divide-line">
      {payouts.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-medium">{p.provider.displayName} · {formatBRL(p.netCents)}</p>
            <p className="text-xs text-muted">Pedido {p.booking.code} ({STATUS_LABEL[p.booking.status]}){p.kind === "CANCELLATION_FEE" ? " · compensação de cancelamento" : ""}{p.note ? ` · ${p.note}` : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge tone={PAYOUT[p.status].tone}>{PAYOUT[p.status].label}</Badge>
            {p.status === "SCHEDULED" && canRelease ? (
              <ActionForm action={releasePayoutAction} submitLabel="Pagar repasse" pendingText="Transferindo…" confirm={`Transferir ${formatBRL(p.netCents)} para ${p.provider.displayName}?`} className="space-y-0">
                <input type="hidden" name="payoutId" value={p.id} />
              </ActionForm>
            ) : null}
          </div>
        </div>
      ))}
    </Card>
  );
}

async function DisputesTab() {
  const bookings = await db.booking.findMany({
    where: { status: { in: ["DISPUTED", "CONFIRMED", "IN_PROGRESS", "COMPLETION_PENDING"] } },
    orderBy: { updatedAt: "desc" },
    take: 50,
    include: { provider: { select: { displayName: true } }, customer: { select: { name: true } }, tickets: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { evidence: true } } },
  });
  if (bookings.length === 0) return <EmptyState title="Nenhum pedido em andamento ou em análise" />;
  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <Card key={b.id} className="p-5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">Pedido {b.code} · {formatBRL(b.totalCents)}</p>
            <Badge tone={b.status === "DISPUTED" ? "danger" : "brand"}>{STATUS_LABEL[b.status]}</Badge>
          </div>
          <p className="mt-1 text-muted">Cliente {b.customer.name} · Profissional {b.provider?.displayName} · {b._count.evidence} foto(s)/vídeo(s)</p>
          {b.tickets[0] ? <p className="mt-2 rounded-xl bg-canvas p-3">“{b.tickets[0].message}”</p> : null}
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ActionForm action={adminRefundAction} submitLabel="Reembolsar cliente" variant="danger" confirm="Confirmar reembolso?">
              <input type="hidden" name="bookingId" value={b.id} />
              <Input name="amount" inputMode="decimal" placeholder="Valor em R$ (vazio = integral/política)" aria-label="Valor do reembolso" />
              <Input name="reason" placeholder="Motivo (registrado na auditoria)" aria-label="Motivo" required />
            </ActionForm>
            {b.status === "DISPUTED" ? (
              <ActionForm action={resolveDisputeCompletedAction} submitLabel="Concluir a favor do profissional" variant="secondary" confirm="Concluir o pedido e liberar o repasse?">
                <input type="hidden" name="bookingId" value={b.id} />
                <Input name="note" placeholder="Conclusão da análise" aria-label="Conclusão da análise" required />
              </ActionForm>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}

async function RefundsTab() {
  const refunds = await db.refund.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { booking: { select: { code: true } } } });
  if (refunds.length === 0) return <EmptyState title="Nenhum reembolso" />;
  return (
    <Card className="divide-y divide-line">
      {refunds.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <div>
            <p className="font-medium">Pedido {r.booking.code} · {formatBRL(r.amountCents)}</p>
            <p className="text-xs text-muted">{formatDateTime(r.createdAt)} · {r.reason}</p>
          </div>
          <Badge tone={r.status === "SUCCEEDED" ? "success" : r.status === "FAILED" ? "danger" : "warning"}>{r.status === "SUCCEEDED" ? "Concluído" : r.status === "FAILED" ? "Falhou" : "Em processamento"}</Badge>
        </div>
      ))}
    </Card>
  );
}
