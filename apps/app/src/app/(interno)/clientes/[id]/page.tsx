import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { ClientForm } from "@/modules/clients/client-form";
import { CompanyList } from "@/modules/clients/company-list";
import { ContactList } from "@/modules/clients/contact-list";
import { DocumentList } from "@/modules/documents/document-list";
import { DocumentRequests } from "@/modules/documents/document-requests";
import {
  updateClient,
  addClientContact,
  deleteClientContact,
  addCompany,
  deleteCompany,
} from "@/modules/clients/actions";
import {
  uploadNewDocument,
  uploadNewVersion,
  requestDocument,
  markRequestReceived,
  cancelRequest,
} from "@/modules/documents/actions";

export default async function ClienteDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: {
      owner: { select: { name: true } },
      contacts: { orderBy: { createdAt: "asc" } },
      companies: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!client) notFound();

  const canWrite = user.role === "ADMIN" || user.role === "GESTOR";
  const canWriteDocs = canWrite || user.role === "OPERACIONAL";

  const [owners, documents, documentRequests] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId, role: { name: { not: "CLIENTE" } }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.document.findMany({
      where: { clientId: client.id, processId: null },
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: { select: { name: true } }, versions: true },
    }),
    prisma.documentRequest.findMany({
      where: { clientId: client.id, processId: null },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const updateThisClient = updateClient.bind(null, client.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <div>
        <Link href="/clientes" className="text-sm text-brand-blue hover:underline">
          ← Voltar para Clientes
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-brand-navy">{client.name}</h1>
          <Badge variant={client.status === "ativo" ? "success" : "neutral"}>
            {client.status === "ativo" ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        <p className="text-sm text-slate-500">
          {client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"} · cliente desde{" "}
          {client.createdAt.toLocaleDateString("pt-BR")}
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-base font-semibold text-brand-navy">Dados do cliente</h2>
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

      {user.role !== "FINANCEIRO" && (
        <>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
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
                  createdAt: d.createdAt.toISOString(),
                  latestFileName: latest?.fileName ?? "",
                  latestSizeBytes: latest?.sizeBytes ?? 0,
                };
              })}
              openRequests={documentRequests
                .filter((r) => r.status === "PENDENTE")
                .map((r) => ({ id: r.id, label: r.label }))}
              uploadNewDocument={uploadNewDocument}
              uploadNewVersion={uploadNewVersion}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
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
