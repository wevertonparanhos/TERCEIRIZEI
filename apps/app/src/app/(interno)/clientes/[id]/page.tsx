import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { getPaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_BADGE_VARIANT } from "@/modules/processes/labels";
import { FREQUENCY_LABELS, isRecurringTaskDue } from "@/modules/recurring-tasks/labels";
import { completeRecurringTaskOccurrence } from "@/modules/recurring-tasks/actions";
import { CompleteRecurringTaskButton } from "@/modules/recurring-tasks/complete-button";
import { ClientForm } from "@/modules/clients/client-form";
import { CompanyList } from "@/modules/clients/company-list";
import { ContactList } from "@/modules/clients/contact-list";
import { PortalAccess } from "@/modules/clients/portal-access";
import { DocumentList } from "@/modules/documents/document-list";
import { DocumentRequests } from "@/modules/documents/document-requests";
import { ClientNotes } from "@/modules/client-notes/client-notes";
import { addClientNote, toggleClientNotePinned, deleteClientNote } from "@/modules/client-notes/actions";
import {
  updateClient,
  addClientContact,
  deleteClientContact,
  addCompany,
  deleteCompany,
  inviteClientToPortal,
} from "@/modules/clients/actions";
import {
  uploadNewDocument,
  uploadNewVersion,
  requestDocument,
  markRequestReceived,
  cancelRequest,
} from "@/modules/documents/actions";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ClienteDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      owner: { select: { name: true } },
      contacts: { orderBy: { createdAt: "asc" } },
      companies: { orderBy: { createdAt: "asc" } },
      users: { select: { email: true }, take: 1 },
    },
  });

  if (!client) notFound();

  const canWrite = user.role === "ADMIN" || user.role === "GESTOR";
  const canWriteDocs = canWrite || user.role === "OPERACIONAL";

  const [owners, documents, documentRequests, payments, recurringTasks, clientNotes] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId, role: { name: { not: "CLIENTE" } }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: { clientId: client.id, processId: null },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { name: true, role: { select: { name: true } } } }, versions: true },
    }),
    prisma.documentRequest.findMany({
      where: { clientId: client.id, processId: null },
      orderBy: { createdAt: "desc" },
    }),
    user.role !== "OPERACIONAL"
      ? prisma.processInstallment.findMany({
          where: { process: { tenantId: user.tenantId, clientId: client.id } },
          orderBy: { paymentDueDate: "asc" },
          include: { process: { select: { number: true, description: true } } },
        })
      : Promise.resolve([]),
    prisma.recurringTask.findMany({
      where: { tenantId: user.tenantId, clientId: client.id },
      orderBy: [{ active: "desc" }, { nextDueAt: "asc" }],
      include: { assignee: { select: { name: true } } },
    }),
    canWriteDocs
      ? prisma.clientNote.findMany({
          where: { tenantId: user.tenantId, clientId: client.id },
          orderBy: { createdAt: "desc" },
          include: { author: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]);

  const updateThisClient = updateClient.bind(null, client.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Link href="/clientes" className="text-sm text-accent hover:underline">
          ← Voltar para Clientes
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">{client.name}</h1>
          <Badge variant={client.status === "ativo" ? "success" : "neutral"}>
            {client.status === "ativo" ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        <p className="text-sm text-muted">
          {client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"} · cliente desde{" "}
          {client.createdAt.toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-ink">Dados do cliente</h2>
        <ClientForm
          owners={owners}
          submitLabel="Salvar alterações"
          onSubmit={updateThisClient}
          readOnly={!canWrite}
          defaultValues={{
            name: client.name,
            fantasyName: client.fantasyName ?? "",
            type: client.type,
            doc: client.doc,
            email: client.email,
            phone: client.phone ?? "",
            whatsapp: client.whatsapp ?? "",
            address: client.address ?? "",
            zipCode: client.zipCode ?? "",
            city: client.city ?? "",
            state: client.state ?? "",
            notes: client.notes ?? "",
            status: client.status as "ativo" | "inativo",
            ownerUserId: client.ownerUserId ?? "",
          }}
        />
      </div>

      <CompanyList
        clientId={client.id}
        companies={client.companies}
        canWrite={canWrite}
        addCompany={addCompany}
        deleteCompany={deleteCompany}
      />

      <ContactList
        clientId={client.id}
        contacts={client.contacts}
        canWrite={canWrite}
        addContact={addClientContact}
        deleteContact={deleteClientContact}
      />

      {canWrite && (
        <PortalAccess
          clientId={client.id}
          linkedEmail={client.users[0]?.email ?? null}
          defaultEmail={client.email}
          invite={inviteClientToPortal}
        />
      )}

      {user.role !== "OPERACIONAL" && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Pagamentos</h2>
            <Link href={`/clientes/${client.id}/relatorio`} className="text-sm text-accent hover:underline">
              Ver relatório por período →
            </Link>
          </div>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted-soft">Nenhuma demanda com pagamento para este cliente.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {payments.map((p) => {
                const status = getPaymentStatus(Number(p.value), p.paymentDueDate, p.paidAt);
                const installmentLabel =
                  payments.filter((other) => other.processId === p.processId).length > 1 ? ` · Parcela ${p.position}` : "";
                return (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link href={`/processos/${p.processId}`} className="text-ink hover:underline">
                      #{p.process.number} — {p.process.description.slice(0, 50)}
                      {installmentLabel}
                    </Link>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">
                        {p.paymentDueDate ? p.paymentDueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}
                      </span>
                      <span className="font-mono text-muted">
                        {currencyFormatter.format(Number(p.value))}
                      </span>
                      <Badge variant={PAYMENT_STATUS_BADGE_VARIANT[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {user.role !== "FINANCEIRO" && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Tarefas Recorrentes</h2>
            <Link href="/tarefas-recorrentes" className="text-sm text-accent hover:underline">
              Gerenciar todas →
            </Link>
          </div>
          {recurringTasks.length === 0 ? (
            <p className="mt-3 text-sm text-muted-soft">Nenhuma tarefa recorrente para este cliente.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {recurringTasks.map((t) => {
                const due = isRecurringTaskDue(t.nextDueAt, t.active);
                return (
                  <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <span className="text-ink">{t.title}</span>
                      <span className="ml-2 text-xs text-muted-soft">
                        {FREQUENCY_LABELS[t.frequency]} · {t.assignee?.name ?? "Sem responsável"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">
                        {t.nextDueAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </span>
                      <Badge variant={!t.active ? "neutral" : due ? "danger" : "success"}>
                        {!t.active ? "Inativa" : due ? "Atrasada" : "Em dia"}
                      </Badge>
                      {t.active && (
                        <CompleteRecurringTaskButton taskId={t.id} completeOccurrence={completeRecurringTaskOccurrence} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {canWriteDocs && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <ClientNotes
            clientId={client.id}
            notes={clientNotes.map((n) => ({
              id: n.id,
              body: n.body,
              createdAt: n.createdAt.toISOString(),
              authorId: n.authorId,
              authorName: n.author.name,
              pinned: n.pinned,
            }))}
            currentUserId={user.id}
            canManageAll={canWrite}
            addNote={addClientNote}
            togglePinned={toggleClientNotePinned}
            deleteNote={deleteClientNote}
          />
        </div>
      )}

      {user.role !== "FINANCEIRO" && (
        <>
          <div className="rounded-lg border border-border bg-surface p-6">
            <DocumentList
              clientId={client.id}
              processId={null}
              canWrite={canWriteDocs}
              documents={documents.map((d) => {
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
              openRequests={documentRequests
                .filter((r) => r.status === "PENDENTE")
                .map((r) => ({ id: r.id, label: r.label }))}
              uploadNewDocument={uploadNewDocument}
              uploadNewVersion={uploadNewVersion}
            />
          </div>

          <div className="rounded-lg border border-border bg-surface p-6">
            <DocumentRequests
              clientId={client.id}
              processId={null}
              canWrite={canWriteDocs}
              requests={documentRequests.map((r) => ({
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
        </>
      )}
    </div>
  );
}
