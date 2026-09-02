import Link from "next/link";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";

export default async function CompaniesPage() {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const companies = await prisma.company.findMany({
    where: { tenantId: user.tenantId! },
    include: { client: { select: { name: true } }, addresses: { select: { city: true, state: true }, take: 1 } },
    orderBy: { legalName: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink">Empresas</h1>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">Razão Social</th>
              <th className="px-4 py-3 font-medium">CNPJ</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Natureza Jurídica</th>
              <th className="px-4 py-3 font-medium">Cidade/UF</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => {
              const address = company.addresses[0];
              return (
                <tr key={company.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="px-4 py-3">
                    <Link href={`/empresas/${company.id}`} className="font-medium text-ink hover:underline">
                      {company.legalName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{company.cnpj}</td>
                  <td className="px-4 py-3 text-muted">{company.client.name}</td>
                  <td className="px-4 py-3 text-muted">{company.legalNature ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{address ? `${address.city}/${address.state}` : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={company.status === "ativa" ? "success" : "neutral"}>{company.status}</Badge>
                  </td>
                </tr>
              );
            })}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Nenhuma empresa cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
