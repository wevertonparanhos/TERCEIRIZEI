import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  client: "Cliente",
  company: "Empresa",
  process: "Processo",
  workflow: "Workflow",
  rule: "Regra",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { entityType?: string; from?: string; to?: string };
}) {
  const user = await requireRole("TENANT_ADMIN");

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: user.tenantId!,
      ...(searchParams.entityType ? { entityType: searchParams.entityType } : {}),
      ...(searchParams.from || searchParams.to
        ? {
            createdAt: {
              ...(searchParams.from ? { gte: new Date(searchParams.from) } : {}),
              ...(searchParams.to ? { lte: new Date(`${searchParams.to}T23:59:59`) } : {}),
            },
          }
        : {}),
    },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Auditoria</h1>
      <p className="mb-6 text-sm text-muted">Trilha das ações mais sensíveis do sistema — últimos {logs.length} registro(s).</p>

      <form className="mb-6 flex flex-wrap gap-3" method="get">
        <Select name="entityType" defaultValue={searchParams.entityType ?? ""} className="max-w-[220px]">
          <option value="">Todos os tipos</option>
          {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <input
          type="date"
          name="from"
          defaultValue={searchParams.from ?? ""}
          className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-ink"
        />
        <input
          type="date"
          name="to"
          defaultValue={searchParams.to ?? ""}
          className="rounded-md border border-border-strong bg-surface px-3 py-2 text-sm text-ink"
        />
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Data/Hora</th>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-soft">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted">
                  {log.createdAt.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-muted">{log.user?.name ?? "Sistema"}</td>
                <td className="px-4 py-3 text-muted">{ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}</td>
                <td className="px-4 py-3 text-ink">{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
