import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_BADGE_VARIANT, getProposalDisplayStatus } from "@/modules/proposals/labels";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function PropostasPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role)) redirect("/dashboard");

  const canManage = user.role === "ADMIN" || user.role === "GESTOR";

  const proposals = await prisma.proposal.findMany({
    where: { tenantId: user.tenantId },
    include: { client: { select: { name: true } }, items: { select: { value: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Propostas</h1>
          <p className="text-sm text-muted">Propostas comerciais enviadas aos clientes.</p>
        </div>
        {canManage && (
          <Link href="/propostas/nova">
            <Button type="button">+ Nova Proposta</Button>
          </Link>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Validade</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {proposals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-soft">
                  Nenhuma proposta cadastrada.
                </td>
              </tr>
            )}
            {proposals.map((p) => {
              const status = getProposalDisplayStatus(p.status, p.validUntil);
              const total = p.items.reduce((sum, item) => sum + Number(item.value), 0);
              return (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="px-4 py-3 text-muted">{p.client.name}</td>
                  <td className="px-4 py-3">
                    <Link href={`/propostas/${p.id}`} className="font-medium text-ink hover:underline">
                      #{p.number} — {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.validUntil ? p.validUntil.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-muted">{currencyFormatter.format(total)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={PROPOSAL_STATUS_BADGE_VARIANT[status]}>{PROPOSAL_STATUS_LABELS[status]}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
