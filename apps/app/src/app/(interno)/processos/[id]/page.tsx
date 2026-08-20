import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PRIORITY_LABELS, PRIORITY_BADGE_VARIANT } from "@/modules/processes/labels";
import { ProcessTabs } from "@/modules/processes/process-tabs";
import { ProcessForm } from "@/modules/processes/process-form";
import { TaskList } from "@/modules/processes/task-list";
import { Checklist } from "@/modules/processes/checklist";
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
} from "@/modules/processes/actions";
import {
  uploadNewDocument,
  uploadNewVersion,
  requestDocument,
  markRequestReceived,
  cancelRequest,
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
      assignedUser: { select: { name: true } },
      stage: { select: { label: true, color: true } },
      tasks: { orderBy: { createdAt: "asc" }, include: { assignee: { select: { name: true } } } },
      checklist: { orderBy: { createdAt: "asc" } },
      stageHistory: {
        orderBy: { changedAt: "asc" },
        include: { fromStage: { select: { label: true } }, toStage: { select: { label: true } } },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        include: { uploadedBy: { select: { name: true } }, versions: true },
      },
      documentRequests: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!process) notFound();
  if (user.role === "OPERACIONAL" && process.assignedUserId !== user.id) redirect("/processos");

  const canWrite = user.role === "ADMIN" || user.role === "GESTOR" || (user.role === "OPERACIONAL" && process.assignedUserId === user.id);

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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/processos" className="text-sm text-brand-blue hover:underline">
            ← Voltar para Processos
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-navy">
              #{process.number} · {process.client.name}
            </h1>
            <Badge variant="info" style={{ backgroundColor: `${process.stage.color}1A`, color: process.stage.color }}>
              {process.stage.label}
            </Badge>
            <Badge variant={PRIORITY_BADGE_VARIANT[process.priority]}>{PRIORITY_LABELS[process.priority]}</Badge>
          </div>
          <p className="text-sm text-slate-500">
            {process.serviceType.name}
            {process.company ? ` · ${process.company.razaoSocial}` : ""} · aberto em{" "}
            {process.createdAt.toLocaleDateString("pt-BR")}
            {process.value ? ` · R$ ${Number(process.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : ""}
          </p>
        </div>
        {["ADMIN", "GESTOR", "FINANCEIRO"].includes(user.role) && (
          <Link href={`/financeiro/nova?processId=${process.id}`}>
            <Button variant="outline">Gerar Fatura</Button>
          </Link>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-2 text-base font-semibold text-brand-navy">Descrição</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">{process.description}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <ProcessTabs
          tabs={[
            {
              key: "geral",
              label: "Visão geral",
              content: (
                <ProcessForm
                  processId={process.id}
                  readOnly={user.role === "FINANCEIRO"}
                  staff={staff}
                  defaultValues={{
                    assignedUserId: process.assignedUserId ?? "",
                    priority: process.priority,
                    value: process.value ? String(process.value) : "",
                    dueAt: process.dueAt ? process.dueAt.toISOString().slice(0, 10) : "",
                    notes: process.notes ?? "",
                  }}
                  updateProcess={updateProcess}
                />
              ),
            },
            {
              key: "tarefas",
              label: "Tarefas",
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
                        createdAt: d.createdAt.toISOString(),
                        latestFileName: latest?.fileName ?? "",
                        latestSizeBytes: latest?.sizeBytes ?? 0,
                      };
                    })}
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
              content: (
                <ul className="space-y-2">
                  {process.stageHistory.map((entry) => (
                    <li key={entry.id} className="text-sm text-slate-600">
                      <span className="font-mono text-xs text-slate-400">
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
