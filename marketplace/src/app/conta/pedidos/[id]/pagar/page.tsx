import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Clock, ShieldCheck } from "lucide-react";
import { HoldCountdown } from "@/components/hold-countdown";
import { Card, Notice } from "@/components/ui/surface";
import { formatBps, formatBRL } from "@/domain/money";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { activeGateway } from "@/server/payments";
import { creditBalance, syncBookingPayments } from "@/server/payments/service";
import { maskCpfCnpj } from "@/domain/documents";
import { expireStaleHolds } from "@/server/scheduling";
import { PaymentPanel } from "./payment-panel";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(["CUSTOMER"], `/conta/pedidos/${id}/pagar`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await expireStaleHolds();
  // Sem webhook (ex.: rodando localmente), consulta o provedor ao abrir a página.
  if (!activeGateway().isSimulated) await syncBookingPayments(id);

  const b = await db.booking.findFirst({
    where: { id, customerId: user.id },
    include: {
      service: { select: { name: true } },
      provider: { select: { displayName: true } },
      payments: { where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!b) notFound();
  // Pago (ou não mais pagável): volta para o pedido.
  if (b.status !== "AWAITING_PAYMENT") redirect(`/conta/pedidos/${b.id}`);

  const gateway = activeGateway();
  const payment = b.payments[0] ?? null;
  const balance = b.creditAppliedCents > 0 ? 0 : await creditBalance(user.id);
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id }, select: { cpfCnpj: true } });
  const remaining = b.totalCents - b.creditAppliedCents;

  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/conta/pedidos/${b.id}`} className="text-sm font-medium text-brand hover:underline">← Pedido {b.code}</Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">Pagamento</h1>
      <p className="text-sm text-muted">{b.service.name} com {b.provider?.displayName}</p>

      {gateway.isSimulated ? (
        <div className="mt-5">
          <Notice tone="warning" title="Ambiente de SIMULAÇÃO">Pagamentos de teste. Nenhuma cobrança real é feita.</Notice>
        </div>
      ) : null}

      <Card className="mt-5 p-5">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Valor do profissional</dt><dd>{formatBRL(b.providerSubtotalCents)}</dd></div>
          {b.commissionMode === "ON_TOP" ? <div className="flex justify-between"><dt className="text-muted">Taxa de serviço ({formatBps(b.commissionRateBps)})</dt><dd>{formatBRL(b.commissionCents)}</dd></div> : null}
          <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>Total</dt><dd className="text-brand">{formatBRL(b.totalCents)}</dd></div>
          {b.creditAppliedCents > 0 ? (
            <>
              <div className="flex justify-between text-success"><dt>Pago com crédito</dt><dd>−{formatBRL(b.creditAppliedCents)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>A pagar</dt><dd>{formatBRL(remaining)}</dd></div>
            </>
          ) : null}
        </dl>
        {b.holdExpiresAt ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft"><Clock className="size-4 text-warning" aria-hidden /> Pague em até <HoldCountdown expiresAt={b.holdExpiresAt.toISOString()} /></p>
        ) : null}
      </Card>

      <Card className="mt-5 p-5">
        <PaymentPanel
          bookingId={b.id}
          simulated={gateway.isSimulated}
          creditBalanceCents={balance}
          needsDocument={gateway.requiresPayerDocument}
          savedDocument={profile?.cpfCnpj ? maskCpfCnpj(profile.cpfCnpj) : null}
          remainingCents={remaining}
          payment={payment ? { id: payment.id, method: payment.method, pixCopyPaste: payment.pixCopyPaste, pixQrImage: payment.pixQrCode, checkoutUrl: payment.checkoutUrl, isSimulated: payment.isSimulated } : null}
        />
      </Card>

      <p className="mt-4 flex items-start gap-2 text-xs text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        A confirmação vem diretamente do provedor de pagamento. Comprovantes enviados manualmente não confirmam o pedido. Não armazenamos dados de cartão.
      </p>
    </div>
  );
}
