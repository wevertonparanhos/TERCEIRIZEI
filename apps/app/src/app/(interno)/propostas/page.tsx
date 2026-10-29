import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_BADGE_VARIANT, getProposalDisplayStatus } from "@/modules/proposals/labels";
import { parseContent } from "@/modules/proposals/content";
import { ProposalsToolbar, ProposalRowActions } from "@/modules/proposals/proposals-toolbar";

export default async function PropostasPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/dashboard");

  const canManage = user.role === "ADMIN" || user.role === "GESTOR";

  const [proposals, templates, clients] = await Promise.all([
    prisma.proposal.findMany({
      where: { tenantId: user.tenantId },
      include: { client: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    }),
    canManage ? prisma.proposalTemplate.findMany({ where: { tenantId: user.tenantId }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    canManage
      ? prisma.client.findMany({ where: { tenantId: user.tenantId, status: "ativo" }, select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const templateSummaries = templates.map((t) => {
    const content = parseContent(t.data, t.name);
    return { id: t.id, name: t.name, services: content.items.length };
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Propostas</h1>
          <p className="text-sm text-muted">Crie e gerencie suas propostas comerciais.</p>
        </div>
        {canManage && <ProposalsToolbar clients={clients} templates={templateSummaries} />}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70 bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Validade</th>
              <th className="px-4 py-3 font-medium">Serviços</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage && <th className="px-4 py-3 text-right font-medium">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 && (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-10 text-center text-muted-soft">
                  Nenhuma proposta cadastrada.
                </td>
              </tr>
            )}
            {proposals.map((p) => {
              const status = getProposalDisplayStatus(p.status, p.validUntil);
              return (
                <tr key={p.id} className={`border-b border-border last:border-0 hover:bg-surface-alt ${p.status === "CANCELADA" ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 text-muted">{p.client?.name ?? <span className="text-muted-soft">Sem cliente</span>}</td>
                  <td className="px-4 py-3">
                    <Link href={`/propostas/${p.id}`} className="font-medium text-ink hover:underline">
                      #{p.number} — {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.validUntil ? p.validUntil.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted">{p._count.items}</td>
                  <td className="px-4 py-3">
                    <Badge variant={PROPOSAL_STATUS_BADGE_VARIANT[status]}>{PROPOSAL_STATUS_LABELS[status]}</Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <ProposalRowActions id={p.id} status={p.status} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
