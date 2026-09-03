import { notFound } from "next/navigation";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { WorkflowStepList } from "@/modules/workflows/workflow-step-list";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

export default async function WorkflowDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole("TENANT_ADMIN");

  const workflow = await prisma.workflow.findFirst({
    where: { id: params.id, tenantId: user.tenantId! },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!workflow) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{workflow.name}</h1>
        <p className="text-sm text-muted">
          {TYPE_LABELS[workflow.processType]} · UF: {workflow.state ?? "qualquer"} · Natureza:{" "}
          {workflow.legalNature ?? "qualquer"}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <WorkflowStepList
          workflowId={workflow.id}
          steps={workflow.steps.map((s) => ({
            id: s.id,
            order: s.order,
            name: s.name,
            estimatedDays: s.estimatedDays,
            requiresDocument: s.requiresDocument,
            requiresProtocol: s.requiresProtocol,
          }))}
        />
      </div>
    </div>
  );
}
