import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";

export default async function PortalCompaniesPage() {
  const user = await requireRole("CLIENT");

  const companies = await prisma.company.findMany({
    where: { clientId: user.clientId! },
    orderBy: { legalName: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink">Minhas Empresas</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-muted">
              <th className="px-4 py-3 font-medium">Razão Social</th>
              <th className="px-4 py-3 font-medium">CNPJ</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-b border-border last:border-0 bg-surface">
                <td className="px-4 py-3 font-medium text-ink">{company.legalName}</td>
                <td className="px-4 py-3 text-muted">{company.cnpj ?? "Aguardando CNPJ"}</td>
                <td className="px-4 py-3">
                  <Badge variant={company.status === "ativa" ? "success" : "neutral"}>{company.status}</Badge>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted-soft">
                  Nenhuma empresa ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
