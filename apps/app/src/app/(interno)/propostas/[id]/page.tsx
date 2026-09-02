import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_BADGE_VARIANT, getProposalDisplayStatus } from "@/modules/proposals/labels";
import { ProposalForm } from "@/modules/proposals/proposal-form";
import { ProposalItems } from "@/modules/proposals/proposal-items";
import { SendProposalButton, DeleteProposalButton } from "@/modules/proposals/proposal-actions";
import { PrintButton } from "@/modules/finance/print-button";
import { updateProposal, addProposalItem, removeProposalItem, sendProposal, deleteProposal } from "@/modules/proposals/actions";

export default async function PropostaDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/dashboard");

  const canManage = user.role === "ADMIN" || user.role === "GESTOR";

  const proposal = await prisma.proposal.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!proposal) notFound();

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId, status: "ativo" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const status = getProposalDisplayStatus(proposal.status, proposal.validUntil);
  const isDraft = proposal.status === "RASCUNHO";
  const updateThisProposal = updateProposal.bind(null, proposal.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8 print:max-w-none">
      <div className="print:hidden">
        <Link href="/propostas" className="text-sm text-accent hover:underline">
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
        <p className="text-sm text-muted">
          {proposal.client.name} · criada por {proposal.createdBy.name}
          {proposal.validUntil ? ` · válida até ${proposal.validUntil.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
        </p>
      </div>

      {isDraft && canManage ? (
        <div className="rounded-lg border border-border bg-surface p-6 print:hidden">
          <h2 className="mb-4 text-base font-semibold text-ink">Dados da proposta</h2>
          <ProposalForm
            clients={clients}
            submitLabel="Salvar alterações"
            defaultValues={{
              clientId: proposal.clientId,
              title: proposal.title,
              validUntil: proposal.validUntil ? proposal.validUntil.toISOString().slice(0, 10) : "",
              notes: proposal.notes ?? "",
            }}
            onSubmit={updateThisProposal}
          />
        </div>
      ) : (
        proposal.notes && (
          <div className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-base font-semibold text-ink">Observações</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{proposal.notes}</p>
          </div>
        )
      )}

      <div className="rounded-lg border border-border bg-surface p-6">
        <ProposalItems
          proposalId={proposal.id}
          items={proposal.items.map((i) => ({ id: i.id, description: i.description, value: i.value.toString() }))}
          canWrite={isDraft && canManage}
          addItem={addProposalItem}
          removeItem={removeProposalItem}
        />
      </div>

      {proposal.status !== "RASCUNHO" && proposal.respondedAt && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="text-base font-semibold text-ink">Resposta do cliente</h2>
          <p className="mt-2 text-sm text-muted">
            {proposal.status === "ACEITA" ? "Aceita" : "Recusada"} em{" "}
            {proposal.respondedAt.toLocaleString("pt-BR")}
          </p>
          {proposal.responseNote && <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{proposal.responseNote}</p>}
        </div>
      )}

      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          {isDraft && canManage && <SendProposalButton proposalId={proposal.id} send={sendProposal} />}
          {isDraft && canManage && <DeleteProposalButton proposalId={proposal.id} deleteProposal={deleteProposal} />}
        </div>
        <PrintButton />
      </div>
    </div>
  );
}
