import Link from "next/link";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { WorkflowForm } from "@/modules/workflows/workflow-form";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

export default async function WorkflowsPage() {
  const user = await requireRole("TENANT_ADMIN");

  const workflows = await prisma.workflow.findMany({
    where: { tenantId: user.tenantId! },
    include: { _count: { select: { steps: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Workflows</h1>
        <Link href="/workflows/regras" className="text-sm text-accent hover:underline">
          Ver regras →
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">UF</th>
              <th className="px-4 py-3 font-medium">Etapas</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((wf) => (
              <tr key={wf.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="px-4 py-3">
                  <Link href={`/workflows/${wf.id}`} className="font-medium text-ink hover:underline">
                    {wf.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{TYPE_LABELS[wf.processType]}</td>
                <td className="px-4 py-3 text-muted">{wf.state ?? "qualquer"}</td>
                <td className="px-4 py-3 text-muted">{wf._count.steps}</td>
                <td className="px-4 py-3">
                  <Badge variant={wf.active ? "success" : "neutral"}>{wf.active ? "ativo" : "inativo"}</Badge>
                </td>
              </tr>
            ))}
            {workflows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Nenhum workflow criado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Criar Workflow</h2>
        <WorkflowForm />
      </div>
    </div>
  );
}
