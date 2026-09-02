import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { CompanyForm } from "@/modules/companies/company-form";
import { updateCompany } from "@/modules/companies/actions";
import { PartnerList } from "@/modules/companies/partner-list";
import { ActivityList } from "@/modules/companies/activity-list";
import { AddressForm } from "@/modules/companies/address-form";

export default async function CompanyDetailPage({ params }: { params: { id: string } }) {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const company = await prisma.company.findFirst({
    where: { id: params.id, tenantId: user.tenantId! },
    include: {
      client: { select: { id: true, name: true } },
      partners: { orderBy: { name: "asc" } },
      activities: { orderBy: { createdAt: "asc" } },
      addresses: { take: 1 },
    },
  });
  if (!company) notFound();

  const address = company.addresses[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{company.legalName}</h1>
        <p className="text-sm text-muted">
          Cliente:{" "}
          <Link href={`/clientes/${company.client.id}`} className="text-accent hover:underline">
            {company.client.name}
          </Link>
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Dados da empresa</h2>
        <CompanyForm
          defaultValues={{
            cnpj: company.cnpj,
            legalName: company.legalName,
            tradeName: company.tradeName ?? undefined,
            legalNature: company.legalNature ?? undefined,
            companySize: company.companySize ?? "",
            capital: company.capital ? String(company.capital) : undefined,
            stateRegistration: company.stateRegistration ?? undefined,
            municipalRegistration: company.municipalRegistration ?? undefined,
            status: company.status as "ativa" | "inativa",
          }}
          onSubmit={updateCompany.bind(null, company.id)}
          submitLabel="Salvar Alterações"
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <PartnerList
          companyId={company.id}
          partners={company.partners.map((p) => ({
            id: p.id,
            name: p.name,
            cpf: p.cpf,
            qualification: p.qualification,
            participationPercentage: Number(p.participationPercentage),
            administrator: p.administrator,
          }))}
        />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <ActivityList companyId={company.id} activities={company.activities} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Endereço</h2>
        <AddressForm
          companyId={company.id}
          defaultValues={
            address
              ? {
                  cep: address.cep,
                  street: address.street,
                  number: address.number,
                  complement: address.complement ?? undefined,
                  neighborhood: address.neighborhood,
                  city: address.city,
                  state: address.state,
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
