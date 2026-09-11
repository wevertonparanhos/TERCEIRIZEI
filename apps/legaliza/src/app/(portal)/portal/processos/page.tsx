import Link from "next/link";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

export default async function PortalProcessesPage() {
  const user = await requireRole("CLIENT");

  const processes = await prisma.process.findMany({
    where: { clientId: user.clientId! },
    include: { company: { select: { legalName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink">Meus Processos</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-muted">
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">UF/Município</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 bg-surface">
                <td className="px-4 py-3">
                  <Link href={`/portal/processos/${p.id}`} className="font-medium text-ink hover:underline">
                    {p.company?.legalName ?? "(nova empresa)"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted">{TYPE_LABELS[p.type]}</td>
                <td className="px-4 py-3 text-muted">
                  {p.municipality}/{p.state}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="neutral">{p.status}</Badge>
                </td>
              </tr>
            ))}
            {processes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted-soft">
                  Nenhum processo ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
