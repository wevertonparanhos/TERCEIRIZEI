import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_BADGE_VARIANT, getProposalDisplayStatus } from "@/modules/proposals/labels";
import { proposalToContent } from "@/modules/proposals/content";
import { ProposalEditor } from "@/modules/proposals/proposal-editor";
import { ProposalDocument, ProposalPrintStyles } from "@/modules/proposals/proposal-document";
import { ProposalViewActions } from "@/modules/proposals/proposal-view-actions";

const dateBR = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

export default async function PropostaDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/dashboard");

  const canManage = user.role === "ADMIN" || user.role === "GESTOR";

  const proposal = await prisma.proposal.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      client: { select: { id: true, name: true, doc: true, address: true, zipCode: true, city: true, state: true, email: true } },
      createdBy: { select: { name: true } },
      items: { orderBy: { position: "asc" } },
    },
  });
  if (!proposal) notFound();

  const content = proposalToContent(proposal);

  if (proposal.status === "RASCUNHO" && canManage) {
    const [clients, blocks] = await Promise.all([
      prisma.client.findMany({
        where: { tenantId: user.tenantId, status: "ativo" },
        select: { id: true, name: true, doc: true, address: true, zipCode: true, city: true, state: true, email: true },
        orderBy: { name: "asc" },
      }),
      prisma.proposalBlock.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" }, select: { id: true, name: true, body: true } }),
    ]);
    return (
      <ProposalEditor
        mode="proposal"
        id={proposal.id}
        number={proposal.number}
        initialClientId={proposal.clientId}
        initialContent={content}
        clients={clients}
        initialBlocks={blocks}
      />
    );
  }

  const status = getProposalDisplayStatus(proposal.status, proposal.validUntil);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8 print:max-w-none print:p-0">
      <ProposalPrintStyles />
      <div className="print:hidden">
        <Link href="/propostas" className="text-sm text-accent hover:underline">
          ← Voltar para Propostas
        </Link>
      </div>
      <div className="print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">
            #{proposal.number} — {proposal.title}
          </h1>
          <Badge variant={PROPOSAL_STATUS_BADGE_VARIANT[status]}>{PROPOSAL_STATUS_LABELS[status]}</Badge>
        </div>
        <p className="text-sm text-muted">
          {proposal.client?.name ?? "Sem cliente"} · criada por {proposal.createdBy.name}
        </p>
      </div>

      <ProposalViewActions id={proposal.id} status={proposal.status} title={proposal.title} canManage={canManage} />

      {proposal.status === "CANCELADA" && (
        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm print:hidden">
          <h2 className="text-base font-semibold text-ink">Proposta cancelada</h2>
          <p className="mt-1 text-sm text-muted">
            {proposal.canceledAt ? `Cancelada em ${proposal.canceledAt.toLocaleString("pt-BR")}. ` : ""}
            Ela não aparece mais para o cliente.
          </p>
          {proposal.cancelReason && <p className="mt-2 whitespace-pre-wrap text-sm text-ink">Motivo: {proposal.cancelReason}</p>}
        </div>
      )}

      {proposal.respondedAt && (proposal.status === "ACEITA" || proposal.status === "RECUSADA") && (
        <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm print:hidden">
          <h2 className="text-base font-semibold text-ink">Resposta do cliente</h2>
          <p className="mt-1 text-sm text-muted">
            {proposal.status === "ACEITA" ? "Aceita" : "Recusada"} em {proposal.respondedAt.toLocaleString("pt-BR")}
          </p>
          {proposal.responseNote && <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{proposal.responseNote}</p>}
        </div>
      )}

      <ProposalDocument
        content={content}
        number={proposal.number}
        client={proposal.client}
        acceptance={
          proposal.status === "ACEITA" && proposal.respondedAt
            ? {
                name: proposal.acceptedByName ?? proposal.client?.name ?? "cliente",
                at: proposal.respondedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
                ip: proposal.acceptedIp,
              }
            : null
        }
        issuedAt={dateBR(proposal.sentAt ?? proposal.createdAt)}
        validUntil={proposal.validUntil ? proposal.validUntil.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : null}
      />
    </div>
  );
}
