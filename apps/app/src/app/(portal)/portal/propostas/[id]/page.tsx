import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_BADGE_VARIANT, getProposalDisplayStatus } from "@/modules/proposals/labels";
import { proposalToContent } from "@/modules/proposals/content";
import { ProposalDocument, ProposalPrintStyles } from "@/modules/proposals/proposal-document";
import { ProposalResponse } from "@/modules/proposals/proposal-response";
import { PrintButton } from "@/modules/finance/print-button";
import { clientRespondProposal } from "@/modules/proposals/actions";

export default async function PortalPropostaDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const proposal = await prisma.proposal.findFirst({
    where: { id: params.id, clientId: user.clientId, status: { notIn: ["RASCUNHO", "CANCELADA"] } },
    include: { items: { orderBy: { position: "asc" } }, client: { select: { id: true, name: true, doc: true, address: true, zipCode: true, city: true, state: true, email: true } } },
  });
  if (!proposal) notFound();

  const status = getProposalDisplayStatus(proposal.status, proposal.validUntil);
  const canRespond = proposal.status === "ENVIADA" && status !== "EXPIRADA";

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8 print:max-w-none print:p-0">
      <ProposalPrintStyles />
      <div className="print:hidden">
        <Link href="/portal/propostas" className="text-sm text-accent hover:underline">
          ← Voltar para Propostas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">
            #{proposal.number} — {proposal.title}
          </h1>
          <Badge variant={PROPOSAL_STATUS_BADGE_VARIANT[status]}>{PROPOSAL_STATUS_LABELS[status]}</Badge>
        </div>
      </div>

      <ProposalDocument
        content={proposalToContent(proposal)}
        number={proposal.number}
        client={proposal.client}
        acceptance={
          proposal.status === "ACEITA" && proposal.respondedAt
            ? { name: proposal.acceptedByName ?? "cliente", at: proposal.respondedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }), ip: proposal.acceptedIp }
            : null
        }
        issuedAt={(proposal.sentAt ?? proposal.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
        validUntil={proposal.validUntil ? proposal.validUntil.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : null}
      />

      {proposal.respondedAt ? (
        <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-sm print:hidden">
          <h2 className="text-base font-semibold text-ink">Sua resposta</h2>
          <p className="mt-2 text-sm text-muted">
            {proposal.status === "ACEITA" ? "Aceita" : "Recusada"} em {proposal.respondedAt.toLocaleString("pt-BR")}
          </p>
          {proposal.responseNote && <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{proposal.responseNote}</p>}
        </div>
      ) : canRespond ? (
        <div className="rounded-2xl border border-border/70 bg-surface p-6 shadow-sm print:hidden">
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
