import Link from "next/link";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

export default async function ProcessesPage() {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const processes = await prisma.process.findMany({
    where: { tenantId: user.tenantId! },
    include: { client: { select: { name: true } }, company: { select: { legalName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">Processos</h1>
        <div className="flex items-center gap-4">
          <Link href="/processos/kanban" className="text-sm text-accent hover:underline">
            Ver Kanban →
          </Link>
          <Link href="/processos/novo">
            <Button>+ Novo Processo</Button>
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">UF/Município</th>
              <th className="px-4 py-3 font-medium">Prioridade</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((process) => (
              <tr key={process.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="px-4 py-3">
                  <Link href={`/processos/${process.id}`} className="font-medium text-ink hover:underline">
                    {process.client.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{process.company?.legalName ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{TYPE_LABELS[process.type]}</td>
                <td className="px-4 py-3 text-muted">
                  {process.municipality}/{process.state}
                </td>
                <td className="px-4 py-3 text-muted">{process.priority}</td>
                <td className="px-4 py-3">
                  <Badge variant={process.status === "COMPLETED" ? "success" : "info"}>{process.status}</Badge>
                </td>
              </tr>
            ))}
            {processes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Nenhum processo criado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
