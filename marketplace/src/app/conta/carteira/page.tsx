import { Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { formatBRL } from "@/domain/money";
import { cn, formatDateTime } from "@/lib/utils";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { creditBalance } from "@/server/payments/service";

const KIND: Record<string, string> = {
  CANCELLATION_CREDIT: "Crédito de cancelamento",
  REFUND_TO_CREDIT: "Devolução em crédito",
  PAYMENT: "Usado em pagamento",
  PAYMENT_REVERSAL: "Crédito devolvido",
  ADMIN_ADJUSTMENT: "Ajuste da equipe",
};

export default async function WalletPage() {
  const user = await requirePageRole(["CUSTOMER"], "/conta/carteira");
  const [balance, entries] = await Promise.all([
    creditBalance(user.id),
    db.customerCredit.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);

  return (
    <>
      <PageHeader title="Minha carteira" description="Créditos para usar em qualquer serviço da plataforma." />
      <Card className="p-6">
        <p className="text-sm text-muted">Saldo disponível</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight text-brand">{formatBRL(balance)}</p>
        <p className="mt-2 text-sm text-muted">O crédito é aplicado na tela de pagamento de um pedido aceito.</p>
      </Card>

      <h2 className="mb-3 mt-8 text-lg font-semibold">Extrato</h2>
      {entries.length === 0 ? (
        <EmptyState title="Nenhuma movimentação" description="Créditos aparecem aqui quando você cancela com menos de 24h e escolhe receber em crédito." />
      ) : (
        <Card className="divide-y divide-line">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{KIND[e.kind] ?? e.kind}</p>
                <p className="text-xs text-muted">{e.description} · {formatDateTime(e.createdAt)}</p>
              </div>
              <span className={cn("font-semibold", e.amountCents > 0 ? "text-success" : "text-ink")}>
                {e.amountCents > 0 ? "+" : "−"}{formatBRL(Math.abs(e.amountCents))}
              </span>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
