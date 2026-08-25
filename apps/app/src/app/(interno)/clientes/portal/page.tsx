import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { PortalAccessRow } from "@/modules/clients/portal-access-row";
import { inviteClientToPortal, deactivateClientPortalAccess, reactivateClientPortalAccess } from "@/modules/clients/actions";

export default async function PortalClientesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/clientes");

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId },
    include: { users: { select: { id: true, email: true, active: true }, take: 1 } },
    orderBy: { name: "asc" },
  });

  const withAccess = clients.filter((c) => c.users.length > 0).length;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink">Portal de Clientes</h1>
      <p className="mt-1 text-sm text-muted">
        Gerencie o acesso de todos os clientes ao Portal a partir daqui — {withAccess} de {clients.length} já têm acesso.
      </p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Acesso ao Portal</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-10 text-center text-muted-soft">
                  Nenhum cliente cadastrado.
                </td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/clientes/${client.id}`} className="font-medium text-ink hover:underline">
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <PortalAccessRow
                    clientId={client.id}
                    defaultEmail={client.email}
                    portalUser={client.users[0] ?? null}
                    invite={inviteClientToPortal}
                    deactivate={deactivateClientPortalAccess}
                    reactivate={reactivateClientPortalAccess}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
