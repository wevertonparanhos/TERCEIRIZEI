import type { PayoutStatus } from "@prisma/client";
import { Badge, Card, EmptyState, Notice, PageHeader, type BadgeTone } from "@/components/ui/surface";
import { formatBRL } from "@/domain/money";
import { formatDateTime } from "@/lib/utils";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { activeGateway } from "@/server/payments";
import { PixKeyForm } from "./pix-key-form";

const maskKey = (k: string) => (k.length <= 6 ? "***" : `${k.slice(0, 3)}***${k.slice(-3)}`);

const PAYOUT: Record<PayoutStatus, { label: string; tone: BadgeTone }> = {
  ON_HOLD: { label: "Retido até a conclusão", tone: "warning" },
  SCHEDULED: { label: "Liberado — aguardando transferência", tone: "brand" },
  PAID: { label: "Pago", tone: "success" },
  FAILED: { label: "Falhou", tone: "danger" },
  CANCELLED: { label: "Cancelado", tone: "neutral" },
};

export default async function ProviderFinancePage() {
  const user = await requirePageRole(["PROVIDER"], "/profissional/financeiro");
  const provider = await db.providerProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true, payoutAccountRef: true, payoutPixKeyType: true, payoutPixKey: true } });
  const payouts = await db.providerPayout.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { booking: { select: { code: true, scheduledStart: true, totalCents: true, commissionCents: true, service: { select: { name: true } } } } },
  });

  const sum = (s: PayoutStatus) => payouts.filter((p) => p.status === s).reduce((a, p) => a + p.netCents, 0);
  const simulated = activeGateway().isSimulated;

  return (
    <>
      <PageHeader title="Financeiro" description="Seus ganhos por pedido. O repasse é liberado após fotos/vídeos do serviço e/ou a confirmação do cliente." />
      {simulated ? (
        <div className="mb-6"><Notice tone="warning" title="Ambiente de SIMULAÇÃO">Valores de teste. Nenhuma transferência real é feita.</Notice></div>
      ) : !provider.payoutPixKey ? (
        <div className="mb-6"><Notice tone="warning" title="Chave PIX pendente">Cadastre sua chave PIX abaixo para receber os repasses.</Notice></div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><p className="text-sm text-muted">Retido (serviço não concluído)</p><p className="mt-1 text-2xl font-bold">{formatBRL(sum("ON_HOLD"))}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Liberado para repasse</p><p className="mt-1 text-2xl font-bold text-brand">{formatBRL(sum("SCHEDULED"))}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Recebido</p><p className="mt-1 text-2xl font-bold">{formatBRL(sum("PAID"))}</p></Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="mb-3 font-semibold">Onde você recebe</h2>
        <PixKeyForm current={provider.payoutPixKey && provider.payoutPixKeyType ? { type: provider.payoutPixKeyType, masked: maskKey(provider.payoutPixKey) } : null} />
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Por pedido</h2>
      {payouts.length === 0 ? (
        <EmptyState title="Nenhum ganho ainda" description="Seus pedidos pagos aparecem aqui." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-line">
                <th className="p-3 font-medium">Pedido</th>
                <th className="p-3 font-medium">Cliente pagou</th>
                <th className="p-3 font-medium">Taxa da plataforma</th>
                <th className="p-3 font-medium">Você recebe</th>
                <th className="p-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-line align-top last:border-0">
                  <td className="p-3">
                    <p className="font-medium">{p.booking.service.name}</p>
                    <p className="text-xs text-muted">{p.booking.code} · {formatDateTime(p.booking.scheduledStart)}</p>
                    {p.kind === "CANCELLATION_FEE" ? <p className="text-xs text-muted">Compensação por cancelamento tardio do cliente</p> : null}
                  </td>
                  <td className="p-3">{formatBRL(p.booking.totalCents)}</td>
                  <td className="p-3">{formatBRL(p.booking.commissionCents)}</td>
                  <td className="p-3 font-semibold">{formatBRL(p.netCents)}{p.feeCents ? <span className="block text-xs font-normal text-muted">taxa do meio de pagamento: {formatBRL(p.feeCents)}</span> : null}</td>
                  <td className="p-3">
                    <Badge tone={PAYOUT[p.status].tone}>{PAYOUT[p.status].label}</Badge>
                    {p.paidAt ? <p className="mt-1 text-xs text-muted">em {formatDateTime(p.paidAt)}{p.isSimulated ? " (simulado)" : ""}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
