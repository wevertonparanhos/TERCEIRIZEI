import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS, PRIORITY_BADGE_VARIANT } from "@/modules/processes/labels";
import { DocumentList } from "@/modules/documents/document-list";
import { DocumentRequests } from "@/modules/documents/document-requests";
import { ProcessComments } from "@/modules/processes/process-comments";
import { ProcessTabs } from "@/modules/processes/process-tabs";
import { ClipboardList, MessageSquare, Paperclip, PackageCheck } from "lucide-react";
import { Deliverables } from "@/modules/processes/deliverables";
import { RealtimeRefresh } from "@/modules/portal/realtime-refresh";
import { ProgressTimeline } from "@/modules/portal/progress-timeline";
import {
  clientUploadDocument,
  clientUploadNewVersion,
  requestDocument,
  markRequestReceived,
  cancelRequest,
  respondDocumentApproval,
} from "@/modules/documents/actions";
import { clientAddProcessComment, respondDeliverable } from "@/modules/processes/actions";

export default async function PortalProcessoDetalhePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const process = await prisma.process.findFirst({
    where: { id: params.id, clientId: user.clientId, visibleInPortal: true },
    include: {
      serviceType: { select: { name: true } },
      company: { select: { razaoSocial: true } },
      stage: { select: { label: true, color: true } },
      stageHistory: { orderBy: { changedAt: "asc" }, include: { toStage: { select: { label: true } } } },
      checklist: { orderBy: { createdAt: "asc" } },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true, role: { select: { name: true } } } }, versions: true },
      },
      documentRequests: { orderBy: { createdAt: "desc" } },
      comments: {
        where: { clientVisible: true },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { name: true, role: { select: { name: true } } } },
          mentions: { include: { mentionedUser: { select: { name: true } } } },
        },
      },
      deliverables: {
        orderBy: { createdAt: "desc" },
        include: { document: { select: { id: true, name: true } } },
      },
    },
  });

  if (!process) notFound();

  const [portalSettings, workspaceStages] = await Promise.all([
    prisma.clientPortalSettings.findUnique({ where: { clientId: user.clientId }, select: { allowApprovals: true } }),
    prisma.kanbanStage.findMany({ where: { workspaceId: process.workspaceId }, orderBy: { position: "asc" }, select: { id: true, label: true, position: true, progressPercent: true } }),
  ]);
  const allowApprovals = portalSettings?.allowApprovals ?? true;

  // Data em que a tarefa chegou a cada etapa (primeira vez).
  const reachedAt: Record<string, string> = {};
  for (const entry of process.stageHistory) {
    if (!reachedAt[entry.toStageId]) reachedAt[entry.toStageId] = entry.changedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <RealtimeRefresh table="processes" filterColumn="client_id" filterValue={user.clientId} />
      <div>
        <Link href="/portal/processos" className="text-sm text-accent hover:underline">
          ← Voltar para Minhas Tarefas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-xl font-bold text-ink sm:text-2xl">
            #{process.number} — {process.description}
          </h1>
          <Badge variant="info" style={{ backgroundColor: `${process.stage.color}1A`, color: process.stage.color }}>
            {process.stage.label}
          </Badge>
          <Badge variant={PRIORITY_BADGE_VARIANT[process.priority]}>{PRIORITY_LABELS[process.priority]}</Badge>
        </div>
        <p className="text-sm text-muted">
          {process.serviceType.name} · {process.company ? `${process.company.razaoSocial} · ` : ""}aberto em{" "}
          {process.createdAt.toLocaleDateString("pt-BR")}
          {process.dueAt ? ` · prazo previsto ${process.dueAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
        </p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm sm:p-6">
        <ProcessTabs
          initialKey={searchParams.tab}
          tabs={[
            {
              key: "resumo",
              label: "Resumo",
              icon: <ClipboardList className="h-4 w-4" />,
              content: (
                <div className="space-y-6">
                  <ProgressTimeline
                    stages={workspaceStages}
                    currentStageId={process.stageId}
                    history={process.stageHistory.map((h) => h.toStageId)}
                    reachedAt={reachedAt}
                    checklist={{ done: process.checklist.filter((i) => i.done).length, total: process.checklist.length }}
                  />
                  <div>
                    <h2 className="mb-2 text-base font-semibold text-ink">Descrição</h2>
                    <p className="whitespace-pre-wrap text-sm text-ink">{process.description}</p>
                  </div>
                  {process.checklist.length > 0 && (
                    <div>
                      <h2 className="mb-3 text-base font-semibold text-ink">
                        Checklist{" "}
                        <span className="text-xs font-normal text-muted-soft">
                          {process.checklist.filter((i) => i.done).length}/{process.checklist.length}
                        </span>
                      </h2>
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
                </div>
              ),
            },
            {
              key: "atividade",
              label: "Atividade",
              icon: <MessageSquare className="h-4 w-4" />,
              content: (
                <div className="space-y-8">
                  <div>
                    <h2 className="mb-3 text-base font-semibold text-ink">Andamento</h2>
                    <ol className="space-y-3 border-l border-border pl-4">
                      {process.stageHistory.map((entry) => (
                        <li key={entry.id} className="relative text-sm">
                          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent" />
                          <p className="text-ink">
                            {entry.fromStageId ? (
                              <>
                                Passou para <b>{entry.toStage.label}</b>
                              </>
                            ) : (
                              <>
                                Tarefa aberta em <b>{entry.toStage.label}</b>
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-soft">
                            {entry.changedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="border-t border-border pt-6">
                    <ProcessComments
                      processId={process.id}
                      comments={process.comments.map((c) => ({
                        id: c.id,
                        body: c.body,
                        createdAt: c.createdAt.toISOString(),
                        authorName: c.author.name,
                        authorIsClient: c.author.role.name === "CLIENTE",
                        mentionedNames: c.mentions.map((m) => m.mentionedUser.name),
                      }))}
                      addComment={clientAddProcessComment}
                    />
                  </div>
                </div>
              ),
            },
            {
              key: "arquivos",
              label: "Arquivos",
              icon: <Paperclip className="h-4 w-4" />,
              content: (
                <div className="space-y-8">
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
                        uploadedByIsClient: d.uploadedBy.role.name === "CLIENTE",
                        createdAt: d.createdAt.toISOString(),
                        latestFileName: latest?.fileName ?? "",
                        latestSizeBytes: latest?.sizeBytes ?? 0,
                        approvalStatus: d.approvalStatus,
                        approvalNote: d.approvalNote,
                      };
                    })}
                    openRequests={process.documentRequests
                      .filter((r) => r.status === "PENDENTE")
                      .map((r) => ({ id: r.id, label: r.label }))}
                    uploadNewDocument={clientUploadDocument}
                    uploadNewVersion={clientUploadNewVersion}
                    respondApproval={respondDocumentApproval}
                  />
                  {process.documentRequests.length > 0 && (
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
                  )}
                </div>
              ),
            },
            ...(process.deliverables.length > 0
              ? [
                  {
                    key: "entregas",
                    label: "Entregas",
                    icon: <PackageCheck className="h-4 w-4" />,
                    content: (
                      <Deliverables
                        processId={process.id}
                        canWrite={false}
                        canRespond={allowApprovals}
                        deliverables={process.deliverables.map((d) => ({
                          id: d.id,
                          type: d.type,
                          title: d.title,
                          content: d.content,
                          url: d.url,
                          documentId: d.documentId,
                          documentName: d.document?.name ?? null,
                          approvalStatus: d.approvalStatus,
                          approvalNote: d.approvalNote,
                          createdAt: d.createdAt.toISOString(),
                        }))}
                        availableDocuments={[]}
                        respondDeliverable={allowApprovals ? respondDeliverable : undefined}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </div>
    </div>
  );
}
