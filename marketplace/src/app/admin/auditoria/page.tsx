import { Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { formatDateTime } from "@/lib/utils";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";

export default async function AdminAuditPage() {
  await requirePagePermission("admin:audit:read", "/admin/auditoria");
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { actor: { select: { name: true, email: true } } },
  });

  return (
    <>
      <PageHeader title="Auditoria" description="Registro imutável das ações administrativas (últimos 200 eventos)." />
      {logs.length === 0 ? (
        <EmptyState title="Nenhuma ação registrada ainda" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-line">
                <th className="p-3 font-medium">Quando</th>
                <th className="p-3 font-medium">Quem</th>
                <th className="p-3 font-medium">Ação</th>
                <th className="p-3 font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-line align-top last:border-0">
                  <td className="whitespace-nowrap p-3 text-muted">{formatDateTime(l.createdAt)}</td>
                  <td className="p-3">{l.actor ? l.actor.name : "Sistema"}</td>
                  <td className="p-3"><code className="rounded bg-ink/5 px-1.5 py-0.5 text-xs">{l.action}</code></td>
                  <td className="p-3">{l.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
