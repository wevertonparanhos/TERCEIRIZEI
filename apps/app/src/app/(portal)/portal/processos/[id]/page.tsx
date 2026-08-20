import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, PRIORITY_BADGE_VARIANT } from "@/modules/processes/labels";
import { DocumentList } from "@/modules/documents/document-list";
import { DocumentRequests } from "@/modules/documents/document-requests";
import { ProcessComments } from "@/modules/processes/process-comments";
import { RealtimeRefresh } from "@/modules/portal/realtime-refresh";
import {
  clientUploadDocument,
  clientUploadNewVersion,
  requestDocument,
  markRequestReceived,
  cancelRequest,
} from "@/modules/documents/actions";
import { clientAddProcessComment } from "@/modules/processes/actions";

export default async function PortalProcessoDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const process = await prisma.process.findFirst({
    where: { id: params.id, clientId: user.clientId },
    include: {
      serviceType: { select: { name: true } },
      company: { select: { razaoSocial: true } },
      stage: { select: { label: true, color: true } },
      checklist: { orderBy: { createdAt: "asc" } },
      documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } }, versions: true } },
      documentRequests: { orderBy: { createdAt: "desc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: { select: { name: true } } } } },
      },
    },
  });

  if (!process) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <RealtimeRefresh table="processes" filterColumn="client_id" filterValue={user.clientId} />
      <div>
        <Link href="/portal/processos" className="text-sm text-accent hover:underline">
          ← Voltar para Meus Processos
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">
            #{process.number} — {process.serviceType.name}
          </h1>
          <Badge variant="info" style={{ backgroundColor: `${process.stage.color}1A`, color: process.stage.color }}>
            {process.stage.label}
          </Badge>
          <Badge variant={PRIORITY_BADGE_VARIANT[process.priority]}>{PRIORITY_LABELS[process.priority]}</Badge>
        </div>
        <p className="text-sm text-muted">
          {process.company ? `${process.company.razaoSocial} · ` : ""}aberto em{" "}
          {process.createdAt.toLocaleDateString("pt-BR")}
          {process.dueAt ? ` · prazo previsto ${process.dueAt.toLocaleDateString("pt-BR")}` : ""}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-2 text-base font-semibold text-ink">Descrição</h2>
        <p className="whitespace-pre-wrap text-sm text-ink">{process.description}</p>
      </div>

      {process.checklist.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="mb-3 text-base font-semibold text-ink">Checklist</h2>
          <ul className="space-y-1.5">
            {process.checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-sm">
                <span className={item.done ? "text-emerald-600" : "text-muted-soft"}>{item.done ? "✓" : "○"}</span>
                <span className={item.done ? "text-muted-soft line-through" : "text-ink"}>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-6">
        <DocumentList
          clientId={user.clientId}
          processId={process.id}
          canWrite
          documents={process.documents.map((d) => {
            const latest = d.versions.find((v) => v.version === d.currentVersion) ?? d.versions[0];
            return {
              id: d.id,
              name: d.name,
              category: d.category,
              currentVersion: d.currentVersion,
              uploadedByName: d.uploadedBy.name,
              createdAt: d.createdAt.toISOString(),
              latestFileName: latest?.fileName ?? "",
              latestSizeBytes: latest?.sizeBytes ?? 0,
            };
          })}
          openRequests={process.documentRequests
            .filter((r) => r.status === "PENDENTE")
            .map((r) => ({ id: r.id, label: r.label }))}
          uploadNewDocument={clientUploadDocument}
          uploadNewVersion={clientUploadNewVersion}
        />
      </div>

      {process.documentRequests.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <DocumentRequests
            clientId={user.clientId}
            processId={process.id}
            canWrite={false}
            requests={process.documentRequests.map((r) => ({
              id: r.id,
              label: r.label,
              deadline: r.deadline ? r.deadline.toISOString() : null,
              status: r.status,
            }))}
            requestDocument={requestDocument}
            markRequestReceived={markRequestReceived}
            cancelRequest={cancelRequest}
          />
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-6">
        <ProcessComments
          processId={process.id}
          comments={process.comments.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            authorName: c.author.name,
            authorIsClient: c.author.role.name === "CLIENTE",
          }))}
          addComment={clientAddProcessComment}
        />
      </div>
    </div>
  );
}
