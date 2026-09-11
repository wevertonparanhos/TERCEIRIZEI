import Link from "next/link";
import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

const COMPLIANCE_TYPE_LABELS: Record<string, string> = {
  CERTIDAO_NEGATIVA: "Certidão Negativa",
  ALVARA: "Alvará",
  CERTIFICADO_DIGITAL: "Certificado Digital",
};

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default async function PortalDashboardPage() {
  const user = await requireRole("CLIENT");
  const clientId = user.clientId!;

  const [statusCounts, recentProcesses, expiringCompliance] = await Promise.all([
    prisma.process.groupBy({ by: ["status"], where: { clientId }, _count: true }),
    prisma.process.findMany({
      where: { clientId },
      include: { company: { select: { legalName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.complianceItem.findMany({
      where: {
        company: { clientId },
        expiresAt: { lt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      },
      include: { company: { select: { legalName: true } } },
      orderBy: { expiresAt: "asc" },
    }),
  ]);

  const countByStatus = (status: string) => statusCounts.find((s) => s.status === status)?._count ?? 0;
  const activeProcesses = statusCounts
    .filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED")
    .reduce((sum, s) => sum + s._count, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Bem-vindo(a), {user.name}</h1>
        <p className="text-sm text-muted">Acompanhe aqui o andamento dos seus processos.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Processos ativos" value={activeProcesses} />
        <KpiCard label="Aguardando você" value={countByStatus("WAITING_CLIENT")} />
        <KpiCard label="Aguardando órgão" value={countByStatus("WAITING_GOVERNMENT")} />
        <KpiCard label="Concluídos" value={countByStatus("COMPLETED")} />
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-medium text-ink">Processos recentes</p>
        {recentProcesses.length > 0 ? (
          <ul className="space-y-2">
            {recentProcesses.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <Link href={`/portal/processos/${p.id}`} className="text-accent hover:underline">
                  {TYPE_LABELS[p.type]} — {p.company?.legalName ?? "(nova empresa)"}
                </Link>
                <span className="text-xs text-muted-soft">{p.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-soft">Nenhum processo ainda.</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-medium text-ink">Compliance vencendo/vencido (próximos 30 dias)</p>
        {expiringCompliance.length > 0 ? (
          <ul className="space-y-2">
            {expiringCompliance.map((item) => {
              const expired = item.expiresAt! < new Date();
              return (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-ink">
                    {COMPLIANCE_TYPE_LABELS[item.type] ?? item.type} "{item.name}" — {item.company.legalName}
                  </span>
                  <span className={`font-mono text-xs ${expired ? "text-red-600" : "text-amber-600"}`}>
                    {expired ? "vencido em " : "vence em "}
                    {item.expiresAt!.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-soft">Nenhum item vencendo nos próximos 30 dias.</p>
        )}
      </div>
    </div>
  );
}
