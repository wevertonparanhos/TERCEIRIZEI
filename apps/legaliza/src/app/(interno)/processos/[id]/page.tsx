import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { ProcessSteps } from "@/modules/processes/process-steps";
import { ProcessStatusSelect } from "@/modules/processes/process-status-select";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

export default async function ProcessDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const process = await prisma.process.findFirst({
    where: { id: params.id, tenantId: user.tenantId! },
    include: {
      client: { select: { id: true, name: true } },
      company: { select: { id: true, legalName: true } },
      workflow: { select: { name: true } },
      steps: { orderBy: { order: "asc" } },
    },
  });
  if (!process) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">
            {TYPE_LABELS[process.type]} —{" "}
            <Link href={`/clientes/${process.client.id}`} className="text-accent hover:underline">
              {process.client.name}
            </Link>
          </h1>
          <p className="text-sm text-muted">
            {process.company ? (
              <>
                Empresa:{" "}
                <Link href={`/empresas/${process.company.id}`} className="text-accent hover:underline">
                  {process.company.legalName}
                </Link>{" "}
                ·{" "}
              </>
            ) : null}
            {process.municipality}/{process.state} · Prioridade {process.priority} · Workflow:{" "}
            {process.workflow?.name ?? "nenhum"}
          </p>
        </div>
        <ProcessStatusSelect processId={process.id} status={process.status} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Etapas</h2>
        <ProcessSteps
          processId={process.id}
          steps={process.steps.map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status,
            order: s.order,
            dueDate: s.dueDate ? s.dueDate.toISOString() : null,
          }))}
        />
      </div>
    </div>
  );
}
