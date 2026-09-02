import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { ClientForm } from "@/modules/clients/client-form";
import { updateClient } from "@/modules/clients/actions";
import { CompanyForm } from "@/modules/companies/company-form";
import { createCompany } from "@/modules/companies/actions";
import { Badge } from "@/components/ui/badge";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: user.tenantId! },
    include: { companies: { orderBy: { legalName: "asc" } } },
  });
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{client.name}</h1>
        <p className="text-sm text-muted">
          {client.type === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"} · {client.doc}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Dados do cliente</h2>
        <ClientForm
          defaultValues={{
            name: client.name,
            fantasyName: client.fantasyName ?? undefined,
            type: client.type,
            doc: client.doc,
            email: client.email,
            phone: client.phone ?? undefined,
            whatsapp: client.whatsapp ?? undefined,
            status: client.status as "ativo" | "inativo",
          }}
          onSubmit={updateClient.bind(null, client.id)}
          submitLabel="Salvar Alterações"
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Empresas ({client.companies.length})</h2>

        {client.companies.length > 0 && (
          <div className="mb-6 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left text-muted">
                  <th className="px-3 py-2 font-medium">Razão Social</th>
                  <th className="px-3 py-2 font-medium">CNPJ</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {client.companies.map((company) => (
                  <tr key={company.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <Link href={`/empresas/${company.id}`} className="font-medium text-ink hover:underline">
                        {company.legalName}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-muted">{company.cnpj}</td>
                    <td className="px-3 py-2">
                      <Badge variant={company.status === "ativa" ? "success" : "neutral"}>{company.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="mb-3 text-sm font-medium text-ink">Adicionar Empresa</h3>
        <CompanyForm onSubmit={createCompany.bind(null, client.id)} submitLabel="Adicionar Empresa" />
      </div>
    </div>
  );
}
