import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  MessageSquare,
  Wallet,
  AlertTriangle,
  ListTodo,
  ListChecks,
  Paperclip,
  History,
} from "lucide-react";
import {
  PRIORITY_LABELS,
  PRIORITY_BADGE_VARIANT,
  hasUnreadClientComment,
  getProcessPaymentSummary,
  isPresenceActive,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_BADGE_VARIANT,
} from "@/modules/processes/labels";
import { ProcessTabs } from "@/modules/processes/process-tabs";
import { ProcessForm } from "@/modules/processes/process-form";
import { TaskList } from "@/modules/processes/task-list";
import { Checklist } from "@/modules/processes/checklist";
import { ProcessComments } from "@/modules/processes/process-comments";
import { MarkCommentsRead } from "@/modules/processes/mark-comments-read";
import { Impediments } from "@/modules/processes/impediments";
import { Installments } from "@/modules/processes/installments";
import { ProcessPresence } from "@/modules/processes/process-presence";
import { DocumentList } from "@/modules/documents/document-list";
import { DocumentRequests } from "@/modules/documents/document-requests";
import {
  updateProcess,
  createTask,
  updateTaskStatus,
  deleteTask,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
  addProcessComment,
  markCommentsRead,
  addInstallment,
  markInstallmentPaid,
  deleteInstallment,
  addImpediment,
  resolveImpediment,
  reopenImpediment,
  markPresence,
  clearPresence,
} from "@/modules/processes/actions";
import {
  uploadNewDocument,
  uploadNewVersion,
  requestDocument,
  markRequestReceived,
  cancelRequest,
  requestDocumentApproval,
} from "@/modules/documents/actions";

export default async function ProcessoDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"].includes(user.role)) redirect("/");

  const process = await prisma.process.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      client: { select: { name: true } },
      company: { select: { razaoSocial: true } },
      serviceType: { select: { name: true } },
      assignees: { select: { userId: true } },
      stage: { select: { label: true, color: true } },
      tasks: { orderBy: { createdAt: "asc" }, include: { assignee: { select: { name: true } } } },
      checklist: { orderBy: { createdAt: "asc" } },
      stageHistory: {
        orderBy: { changedAt: "asc" },
        include: { fromStage: { select: { label: true } }, toStage: { select: { label: true } } },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true, role: { select: { name: true } } } }, versions: true },
      },
      documentRequests: { orderBy: { createdAt: "desc" } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { name: true, role: { select: { name: true } } } },
          mentions: { include: { mentionedUser: { select: { name: true } } } },
        },
      },
      commentReads: { where: { userId: user.id }, select: { lastReadAt: true } },
      impediments: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { name: true } }, resolvedBy: { select: { name: true } } },
      },
      installments: { orderBy: { position: "asc" } },
      presence: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  if (!process) notFound();
  const isAssignedToMe = process.assignees.some((a) => a.userId === user.id);
  // Ser mencionado num comentário dá acesso de leitura ao processo mesmo sem
  // ser responsável — senão a notificação de menção levaria a um redirect.
  const isMentionedHere = process.comments.some((c) => c.mentions.some((m) => m.mentionedUserId === user.id));
  if (user.role === "OPERACIONAL" && !isAssignedToMe && !isMentionedHere) redirect("/processos");

  const canWrite = user.role === "ADMIN" || user.role === "GESTOR" || (user.role === "OPERACIONAL" && isAssignedToMe);

  const lastClientCommentAt = [...process.comments]
    .reverse()
    .find((c) => c.author.role.name === "CLIENTE")?.createdAt;
  const hasUnreadComment = hasUnreadClientComment(
    lastClientCommentAt ?? null,
    process.commentReads[0]?.lastReadAt ?? null
  );
  const hasUnreadMention = process.comments.some((c) =>
    c.mentions.some((m) => m.mentionedUserId === user.id && !m.readAt)
  );
  const hasOpenImpediment = process.impediments.some((i) => !i.resolvedAt);

  const [staff, stageUsers] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId, role: { name: { in: ["ADMIN", "GESTOR", "OPERACIONAL"] } }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { id: { in: process.stageHistory.map((s) => s.userId).filter((id): id is string => !!id) } },
      select: { id: true, name: true },
    }),
  ]);
  const userNameById = new Map(stageUsers.map((u) => [u.id, u.name]));

  const paymentSummary = getProcessPaymentSummary(
    process.installments.map((i) => ({ value: Number(i.value), paymentDueDate: i.paymentDueDate, paidAt: i.paidAt }))
  );

  const activePresenceUsers = process.presence
    .filter((p) => isPresenceActive(p.lastSeenAt))
    .map((p) => ({ id: p.user.id, name: p.user.name }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <MarkCommentsRead processId={process.id} markCommentsRead={markCommentsRead} />
      <div className="flex items-start justify-between">
        <div>
          <Link href="/processos" className="text-sm text-accent hover:underline">
            ← Voltar para Processos
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">
              #{process.number} · {process.client.name}
            </h1>
            <Badge variant="info" style={{ backgroundColor: `${process.stage.color}1A`, color: process.stage.color }}>
              {process.stage.label}
            </Badge>
            <Badge variant={PRIORITY_BADGE_VARIANT[process.priority]}>{PRIORITY_LABELS[process.priority]}</Badge>
            {paymentSummary.status !== "SEM_PAGAMENTO" && (
              <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[paymentSummary.status]}>{PAYMENT_STATUS_LABELS[paymentSummary.status]}</Badge>
            )}
          </div>
          <p className="text-sm text-muted">
            {process.serviceType.name}
            {process.company ? ` · ${process.company.razaoSocial}` : ""} · aberto em{" "}
            {process.createdAt.toLocaleDateString("pt-BR")}
            {process.requestedDeadline
              ? ` · prazo desejado ${process.requestedDeadline.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`
              : ""}
            {paymentSummary.totalValue > 0
              ? ` · R$ ${paymentSummary.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : ""}
          </p>
        </div>
        {user.role !== "FINANCEIRO" && (
          <ProcessPresence
            processId={process.id}
            currentUserId={user.id}
            activeUsers={activePresenceUsers}
            markPresence={markPresence}
            clearPresence={clearPresence}
          />
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-2 text-base font-semibold text-ink">Descrição</h2>
        <p className="whitespace-pre-wrap text-sm text-ink">{process.description}</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <ProcessTabs
          tabs={[
            {
              key: "geral",
              label: "Visão geral",
              icon: <FileText className="h-4 w-4" />,
              content: (
                <ProcessForm
                  processId={process.id}
                  readOnly={!canWrite}
                  staff={staff}
                  defaultValues={{
                    assigneeIds: process.assignees.map((a) => a.userId),
                    priority: process.priority,
                    dueAt: process.dueAt ? process.dueAt.toISOString().slice(0, 10) : "",
                    visibleInPortal: process.visibleInPortal,
                    notes: process.notes ?? "",
                  }}
                  updateProcess={updateProcess}
                />
              ),
            },
            {
              key: "comentarios",
              label: "Comentários",
              icon: <MessageSquare className="h-4 w-4" />,
              badge: hasUnreadComment || hasUnreadMention,
              content: (
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
                  mentionable={staff}
                  addComment={addProcessComment}
                />
              ),
            },
            {
              key: "pagamentos",
              label: "Pagamentos",
              icon: <Wallet className="h-4 w-4" />,
              badge: paymentSummary.status === "ATRASADO",
              content: (
                <Installments
                  processId={process.id}
                  canWrite={canWrite}
                  installments={process.installments.map((i) => ({
                    id: i.id,
                    position: i.position,
                    value: Number(i.value),
                    paymentDueDate: i.paymentDueDate ? i.paymentDueDate.toISOString() : null,
                    paidAt: i.paidAt ? i.paidAt.toISOString() : null,
                  }))}
                  addInstallment={addInstallment}
                  markInstallmentPaid={markInstallmentPaid}
                  deleteInstallment={deleteInstallment}
                />
              ),
            },
            {
              key: "impedimentos",
              label: "Impedimentos",
              icon: <AlertTriangle className="h-4 w-4" />,
              badge: hasOpenImpediment,
              content: (
                <Impediments
                  processId={process.id}
                  canWrite={canWrite}
                  impediments={process.impediments.map((i) => ({
                    id: i.id,
                    title: i.title,
                    createdAt: i.createdAt.toISOString(),
                    createdByName: i.createdBy.name,
                    resolvedAt: i.resolvedAt ? i.resolvedAt.toISOString() : null,
                    resolvedByName: i.resolvedBy?.name ?? null,
                  }))}
                  addImpediment={addImpediment}
                  resolveImpediment={resolveImpediment}
                  reopenImpediment={reopenImpediment}
                />
              ),
            },
            {
              key: "tarefas",
              label: "Tarefas",
              icon: <ListTodo className="h-4 w-4" />,
              content: (
                <TaskList
                  processId={process.id}
                  staff={staff}
                  canWrite={canWrite}
                  tasks={process.tasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
                    assigneeName: t.assignee?.name ?? null,
                  }))}
                  createTask={createTask}
                  updateTaskStatus={updateTaskStatus}
                  deleteTask={deleteTask}
                />
              ),
            },
            {
              key: "checklist",
              label: "Checklist",
              icon: <ListChecks className="h-4 w-4" />,
              content: (
                <Checklist
                  processId={process.id}
                  canWrite={canWrite}
                  items={process.checklist}
                  addItem={addChecklistItem}
                  toggleItem={toggleChecklistItem}
                  deleteItem={deleteChecklistItem}
                />
              ),
            },
            ...(user.role !== "FINANCEIRO"
              ? [
            {
              key: "documentos",
              label: "Documentos",
              icon: <Paperclip className="h-4 w-4" />,
              content: (
                <div className="space-y-8">
                  <DocumentList
                    clientId={process.clientId}
                    processId={process.id}
                    canWrite={canWrite}
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
                    requestApproval={requestDocumentApproval}
                    openRequests={process.documentRequests
                      .filter((r) => r.status === "PENDENTE")
                      .map((r) => ({ id: r.id, label: r.label }))}
                    uploadNewDocument={uploadNewDocument}
                    uploadNewVersion={uploadNewVersion}
                  />
                  <DocumentRequests
                    clientId={process.clientId}
                    processId={process.id}
                    canWrite={canWrite}
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
              ),
            },
              ]
              : []),
            {
              key: "historico",
              label: "Histórico",
              icon: <History className="h-4 w-4" />,
              content: (
                <ul className="space-y-2">
                  {process.stageHistory.map((entry) => (
                    <li key={entry.id} className="text-sm text-muted">
                      <span className="font-mono text-xs text-muted-soft">
                        {entry.changedAt.toLocaleString("pt-BR")}
                      </span>{" "}
                      — {entry.userId ? userNameById.get(entry.userId) ?? "Sistema" : "Sistema"}{" "}
                      {entry.fromStage ? (
                        <>
                          moveu de <b>{entry.fromStage.label}</b> para{" "}
                        </>
                      ) : (
                        "abriu o processo em "
                      )}
                      <b>{entry.toStage.label}</b>
                    </li>
                  ))}
                </ul>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
