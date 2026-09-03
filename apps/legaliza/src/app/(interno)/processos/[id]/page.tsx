import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { ProcessSteps } from "@/modules/processes/process-steps";
import { ProcessStatusSelect } from "@/modules/processes/process-status-select";
import { ChecklistList } from "@/modules/checklist/checklist-list";
import { DocumentList } from "@/modules/documents/document-list";
import { ProtocolList } from "@/modules/protocols/protocol-list";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

export default async function ProcessDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const [process, agencies] = await Promise.all([
    prisma.process.findFirst({
      where: { id: params.id, tenantId: user.tenantId! },
      include: {
        client: { select: { id: true, name: true } },
        company: { select: { id: true, legalName: true } },
        workflow: { select: { name: true } },
        steps: { orderBy: { order: "asc" } },
        checklistItems: { orderBy: { createdAt: "asc" } },
        documents: { orderBy: { createdAt: "desc" } },
        protocols: { include: { governmentAgency: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.governmentAgency.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
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

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Checklist</h2>
        <ChecklistList
          processId={process.id}
          items={process.checklistItems.map((i) => ({ id: i.id, label: i.label, required: i.required, done: i.done }))}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Documentos</h2>
        <DocumentList
          processId={process.id}
          documents={process.documents.map((d) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            currentVersion: d.currentVersion,
          }))}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Protocolos</h2>
        <ProtocolList
          processId={process.id}
          protocols={process.protocols.map((p) => ({
            id: p.id,
            protocolNumber: p.protocolNumber,
            status: p.status,
            url: p.url,
            governmentAgency: p.governmentAgency,
          }))}
          agencies={agencies}
          steps={process.steps.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </div>
  );
}
