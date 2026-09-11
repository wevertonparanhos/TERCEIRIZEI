import { notFound } from "next/navigation";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PortalDocumentList } from "@/modules/portal/portal-document-list";
import { DocumentRequestList } from "@/modules/document-requests/document-request-list";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

export default async function PortalProcessDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole("CLIENT");

  const process = await prisma.process.findFirst({
    where: { id: params.id, clientId: user.clientId! },
    include: {
      company: { select: { id: true, legalName: true } },
      steps: { orderBy: { order: "asc" } },
      checklistItems: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
      documentRequests: { orderBy: { createdAt: "desc" } },
      protocols: { include: { governmentAgency: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!process) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">
          {TYPE_LABELS[process.type]}
          {process.company ? ` — ${process.company.legalName}` : ""}
        </h1>
        <p className="text-sm text-muted">
          {process.municipality}/{process.state} · Status: {process.status}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Etapas</h2>
        <ul className="space-y-2">
          {process.steps.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-ink">{s.name}</span>
              <div className="flex items-center gap-3">
                {s.dueDate && (
                  <span className="text-xs text-muted-soft">
                    prazo: {s.dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </span>
                )}
                <Badge variant={s.status === "COMPLETED" ? "success" : "neutral"}>{s.status}</Badge>
              </div>
            </li>
          ))}
          {process.steps.length === 0 && <p className="text-sm text-muted-soft">Nenhuma etapa ainda.</p>}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Checklist</h2>
        <ul className="space-y-2">
          {process.checklistItems.map((i) => (
            <li key={i.id} className="flex items-center justify-between text-sm">
              <span className={i.done ? "text-muted-soft line-through" : "text-ink"}>{i.label}</span>
              <Badge variant={i.done ? "success" : "neutral"}>{i.done ? "Concluído" : "Pendente"}</Badge>
            </li>
          ))}
          {process.checklistItems.length === 0 && <p className="text-sm text-muted-soft">Nenhum item ainda.</p>}
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Documentos Pedidos</h2>
        <DocumentRequestList
          processId={process.id}
          requests={process.documentRequests.map((r) => ({
            id: r.id,
            label: r.label,
            deadline: r.deadline ? r.deadline.toISOString() : null,
            status: r.status,
            documentId: r.documentId,
          }))}
          canCreate={false}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Documentos</h2>
        <PortalDocumentList
          processId={process.id}
          documents={process.documents.map((d) => ({ id: d.id, name: d.name, currentVersion: d.currentVersion }))}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Protocolos</h2>
        {process.protocols.length > 0 ? (
          <ul className="space-y-2">
            {process.protocols.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <span className="text-ink">
                  {p.protocolNumber} — {p.governmentAgency.name}
                </span>
                <Badge variant="neutral">{p.status}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-soft">Nenhum protocolo registrado ainda.</p>
        )}
      </div>
    </div>
  );
}
