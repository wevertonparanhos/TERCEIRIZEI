import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { ClientForm } from "@/modules/clients/client-form";
import { CompanyList } from "@/modules/clients/company-list";
import { ContactList } from "@/modules/clients/contact-list";
import {
  updateClient,
  addClientContact,
  deleteClientContact,
  addCompany,
  deleteCompany,
} from "@/modules/clients/actions";

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

  const owners = await prisma.user.findMany({
    where: { tenantId: user.tenantId, role: { name: { not: "CLIENTE" } }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

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
    </div>
  );
}
