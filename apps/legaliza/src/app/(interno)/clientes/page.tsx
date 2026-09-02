import Link from "next/link";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ClientsPage() {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId! },
    include: { _count: { select: { companies: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Clientes</h1>
        <Link href="/clientes/novo">
          <Button>+ Novo Cliente</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">CPF/CNPJ</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Empresas</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="px-4 py-3">
                  <Link href={`/clientes/${client.id}`} className="font-medium text-ink hover:underline">
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{client.doc}</td>
                <td className="px-4 py-3 text-muted">{client.phone ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{client._count.companies}</td>
                <td className="px-4 py-3">
                  <Badge variant={client.status === "ativo" ? "success" : "neutral"}>{client.status}</Badge>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Nenhum cliente cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
