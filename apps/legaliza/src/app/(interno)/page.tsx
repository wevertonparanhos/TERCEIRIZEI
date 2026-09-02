import { prisma } from "@legaliza/db";
import { requireUser } from "@/lib/rbac";

// Sem consumidor de UI real ainda (Fase 2 em diante) — esta tela só prova que
// autenticação + RBAC + isolamento multi-tenant funcionam de ponta a ponta:
// cada TENANT_ADMIN só enxerga o próprio tenant/usuários; SUPER_ADMIN enxerga
// todos os tenants da plataforma.
export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === "SUPER_ADMIN") {
    const tenants = await prisma.tenant.findMany({
      include: { users: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold text-ink">Plataforma — todos os tenants</h1>
        <p className="mb-6 text-sm text-muted">
          Você está logado como Super Admin: acesso cross-tenant, fora do isolamento normal.
        </p>
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <div key={tenant.id} className="rounded-lg border border-border bg-surface p-4">
              <p className="font-medium text-ink">{tenant.name}</p>
              <p className="text-xs text-muted-soft">{tenant.id}</p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {tenant.users.map((u) => (
                  <li key={u.email}>
                    {u.name} — {u.email}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const tenant = user.tenantId ? await prisma.tenant.findUnique({ where: { id: user.tenantId } }) : null;
  const teamUsers = user.tenantId
    ? await prisma.user.findMany({
        where: { tenantId: user.tenantId },
        select: { name: true, email: true, role: { select: { name: true } } },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">{tenant?.name ?? "Sem tenant"}</h1>
      <p className="mb-6 text-sm text-muted">
        Você só enxerga dados do seu próprio tenant — isolamento multi-tenant em ação.
      </p>
      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-2 text-sm font-medium text-ink">Usuários do meu tenant ({teamUsers.length})</p>
        <ul className="space-y-1 text-sm text-muted">
          {teamUsers.map((u) => (
            <li key={u.email}>
              {u.name} — {u.email} <span className="text-muted-soft">({u.role.name})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
