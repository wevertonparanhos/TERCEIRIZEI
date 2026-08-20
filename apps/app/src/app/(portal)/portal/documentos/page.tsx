import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { DocumentList } from "@/modules/documents/document-list";
import { DocumentRequests } from "@/modules/documents/document-requests";
import { RealtimeRefresh } from "@/modules/portal/realtime-refresh";
import {
  clientUploadDocument,
  clientUploadNewVersion,
  requestDocument,
  markRequestReceived,
  cancelRequest,
} from "@/modules/documents/actions";

export default async function PortalDocumentosPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const [documents, requests] = await Promise.all([
    prisma.document.findMany({
      where: { clientId: user.clientId, processId: null },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { name: true } }, versions: true },
    }),
    prisma.documentRequest.findMany({
      where: { clientId: user.clientId, processId: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <RealtimeRefresh table="document_requests" filterColumn="client_id" filterValue={user.clientId} />
      <div>
        <h1 className="text-2xl font-bold text-ink">Documentos</h1>
        <p className="text-sm text-muted">Documentos gerais, não ligados a um processo específico.</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <DocumentList
          clientId={user.clientId}
          processId={null}
          canWrite
          documents={documents.map((d) => {
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
          openRequests={requests.filter((r) => r.status === "PENDENTE").map((r) => ({ id: r.id, label: r.label }))}
          uploadNewDocument={clientUploadDocument}
          uploadNewVersion={clientUploadNewVersion}
        />
      </div>

      {requests.length > 0 && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <DocumentRequests
            clientId={user.clientId}
            processId={null}
            canWrite={false}
            requests={requests.map((r) => ({
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
    </div>
  );
}
