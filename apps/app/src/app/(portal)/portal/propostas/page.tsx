import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_BADGE_VARIANT, getProposalDisplayStatus } from "@/modules/proposals/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PortalPropostasPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const proposals = await prisma.proposal.findMany({
    where: { clientId: user.clientId, status: { not: "RASCUNHO" } },
    include: { items: { select: { value: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-ink">Propostas</h1>
      <p className="mt-1 text-sm text-muted">Propostas comerciais enviadas pela Terceirizei.</p>

      <div className="mt-6 space-y-3">
        {proposals.length === 0 && <p className="text-sm text-muted-soft">Nenhuma proposta recebida ainda.</p>}
        {proposals.map((p) => {
          const status = getProposalDisplayStatus(p.status, p.validUntil);
          const total = p.items.reduce((sum, item) => sum + Number(item.value), 0);
          return (
            <Link
              key={p.id}
              href={`/portal/propostas/${p.id}`}
              className="block rounded-lg border border-border bg-surface p-5 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-soft">#{p.number}</span>
                <Badge variant={PROPOSAL_STATUS_BADGE_VARIANT[status]}>{PROPOSAL_STATUS_LABELS[status]}</Badge>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <p className="text-sm text-muted">
                  {p.title}
                  {p.validUntil ? ` · válida até ${p.validUntil.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
                </p>
                <span className="font-mono text-lg font-semibold text-ink">{currencyFormatter.format(total)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
