import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ProposalForm } from "@/modules/proposals/proposal-form";
import { createProposal } from "@/modules/proposals/actions";

export default async function NovaPropostaPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/propostas");

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId, status: "ativo" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/propostas" className="text-sm text-accent hover:underline">
        ← Voltar para Propostas
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">Nova Proposta</h1>
      <p className="mt-1 text-sm text-muted">Adicione os itens da proposta depois de criá-la.</p>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <ProposalForm clients={clients} onSubmit={createProposal} />
      </div>
    </div>
  );
}
