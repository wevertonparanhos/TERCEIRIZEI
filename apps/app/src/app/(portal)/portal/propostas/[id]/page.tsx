import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_BADGE_VARIANT, getProposalDisplayStatus } from "@/modules/proposals/labels";
import { ProposalResponse } from "@/modules/proposals/proposal-response";
import { PrintButton } from "@/modules/finance/print-button";
import { clientRespondProposal } from "@/modules/proposals/actions";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PortalPropostaDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const proposal = await prisma.proposal.findFirst({
    where: { id: params.id, clientId: user.clientId, status: { not: "RASCUNHO" } },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!proposal) notFound();

  const status = getProposalDisplayStatus(proposal.status, proposal.validUntil);
  const total = proposal.items.reduce((sum, item) => sum + Number(item.value), 0);
  const canRespond = proposal.status === "ENVIADA" && status !== "EXPIRADA";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8 print:max-w-none">
      <div className="print:hidden">
        <Link href="/portal/propostas" className="text-sm text-accent hover:underline">
          ← Voltar para Propostas
        </Link>
      </div>
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">
            #{proposal.number} — {proposal.title}
          </h1>
          <Badge variant={PROPOSAL_STATUS_BADGE_VARIANT[status]}>{PROPOSAL_STATUS_LABELS[status]}</Badge>
        </div>
        {proposal.validUntil && (
          <p className="text-sm text-muted">Válida até {proposal.validUntil.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</p>
        )}
      </div>

      {proposal.notes && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <p className="whitespace-pre-wrap text-sm text-muted">{proposal.notes}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Itens</h2>
          <span className="font-mono text-lg font-semibold text-ink">{currencyFormatter.format(total)}</span>
        </div>
        <ul className="mt-3 divide-y divide-border">
          {proposal.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink">{item.description}</span>
              <span className="font-mono text-muted">{currencyFormatter.format(Number(item.value))}</span>
            </li>
          ))}
        </ul>
      </div>

      {proposal.respondedAt ? (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-ink">Sua resposta</h2>
          <p className="mt-2 text-sm text-muted">
            {proposal.status === "ACEITA" ? "Aceita" : "Recusada"} em {proposal.respondedAt.toLocaleString("pt-BR")}
          </p>
          {proposal.responseNote && <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{proposal.responseNote}</p>}
        </div>
      ) : canRespond ? (
        <div className="rounded-lg border border-border bg-surface p-6 print:hidden">
          <ProposalResponse proposalId={proposal.id} respond={clientRespondProposal} />
        </div>
      ) : status === "EXPIRADA" ? (
        <p className="text-sm text-muted-soft print:hidden">Esta proposta venceu e não pode mais ser respondida.</p>
      ) : null}

      <div className="print:hidden">
        <PrintButton />
      </div>
    </div>
  );
}
