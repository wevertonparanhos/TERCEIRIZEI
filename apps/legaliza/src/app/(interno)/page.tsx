import Link from "next/link";
import { prisma } from "@legaliza/db";
import { requireUser } from "@/lib/rbac";

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

// Alerta com 30 dias de antecedência — mesmo corte usado em compliance-list.tsx.
const COMPLIANCE_ALERT_WINDOW_DAYS = 30;

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Rascunho",
  NEW: "Novo",
  TRIAGE: "Triagem",
  WAITING_DOCUMENTS: "Aguardando Documentos",
  READY: "Pronto",
  IN_PROGRESS: "Em Execução",
  WAITING_CLIENT: "Aguardando Cliente",
  WAITING_GOVERNMENT: "Aguardando Órgão",
  PENDING: "Pendência",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function BarList({ rows }: { rows: { label: string; count: number; color?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3 text-sm">
          <span className="w-40 flex-none truncate text-muted">{row.label}</span>
          <div className="h-2 flex-1 rounded-full bg-surface-alt">
            <div
              className="h-2 rounded-full bg-accent"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 flex-none text-right font-mono text-xs text-muted-soft">{row.count}</span>
        </div>
      ))}
    </div>
  );
}

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

  if (!user.tenantId) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold text-ink">Sem tenant</h1>
        <p className="text-sm text-muted">Este usuário não está associado a nenhum tenant.</p>
      </div>
    );
  }

  const tenantId = user.tenantId;

  const [statusCounts, typeCounts, clientCount, companyCount, overdueProtocols, expiringCompliance] = await Promise.all([
    prisma.process.groupBy({ by: ["status"], where: { tenantId }, _count: true }),
    prisma.process.groupBy({ by: ["type"], where: { tenantId }, _count: true }),
    prisma.client.count({ where: { tenantId } }),
    prisma.company.count({ where: { tenantId } }),
    prisma.protocol.findMany({
      where: {
        tenantId,
        expectedResponseAt: { lt: new Date() },
        status: { notIn: ["APPROVED", "REJECTED", "COMPLETED"] },
      },
      include: { governmentAgency: { select: { name: true } }, process: { select: { id: true } } },
      orderBy: { expectedResponseAt: "asc" },
    }),
    prisma.complianceItem.findMany({
      where: {
        tenantId,
        expiresAt: { lt: new Date(Date.now() + COMPLIANCE_ALERT_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
      },
      include: { company: { select: { id: true, legalName: true } } },
      orderBy: { expiresAt: "asc" },
    }),
  ]);

  const countByStatus = (status: string) => statusCounts.find((s) => s.status === status)?._count ?? 0;
  const activeProcesses = statusCounts
    .filter((s) => s.status !== "COMPLETED" && s.status !== "CANCELLED")
    .reduce((sum, s) => sum + s._count, 0);

  const statusRows = Object.entries(STATUS_LABELS)
    .map(([status, label]) => ({ label, count: countByStatus(status) }))
    .filter((row) => row.count > 0);

  const typeRows = Object.entries(TYPE_LABELS).map(([type, label]) => ({
    label,
    count: typeCounts.find((t) => t.type === type)?._count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">{tenant?.name ?? "Dashboard"}</h1>
        <p className="text-sm text-muted">Visão geral do seu tenant.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Processos ativos" value={activeProcesses} />
        <KpiCard label="Aguardando cliente" value={countByStatus("WAITING_CLIENT")} />
        <KpiCard label="Aguardando órgão" value={countByStatus("WAITING_GOVERNMENT")} />
        <KpiCard label="Pendências" value={countByStatus("PENDING")} />
        <KpiCard label="Concluídos" value={countByStatus("COMPLETED")} />
        <KpiCard label="Clientes" value={clientCount} />
        <KpiCard label="Empresas" value={companyCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium text-ink">Processos por status</p>
          {statusRows.length > 0 ? (
            <BarList rows={statusRows} />
          ) : (
            <p className="text-sm text-muted-soft">Nenhum processo criado ainda.</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-3 text-sm font-medium text-ink">Processos por tipo</p>
          <BarList rows={typeRows} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-4">
        <p className="mb-3 text-sm font-medium text-ink">Protocolos com prazo vencido</p>
        {overdueProtocols.length > 0 ? (
          <ul className="space-y-2">
            {overdueProtocols.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm">
                <Link href={`/processos/${p.process.id}`} className="text-accent hover:underline">
                  {p.protocolNumber} — {p.governmentAgency.name}
                </Link>
                <span className="font-mono text-xs text-red-600">
                  vencido em {p.expectedResponseAt!.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-soft">Nenhum protocolo com prazo vencido.</p>
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
                  <Link href={`/empresas/${item.company.id}`} className="text-accent hover:underline">
                    {COMPLIANCE_TYPE_LABELS[item.type] ?? item.type} "{item.name}" — {item.company.legalName}
                  </Link>
                  <span className={`font-mono text-xs ${expired ? "text-red-600" : "text-amber-600"}`}>
                    {expired ? "vencido em " : "vence em "}
                    {item.expiresAt!.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-soft">Nenhum item de compliance vencendo nos próximos 30 dias.</p>
        )}
      </div>
    </div>
  );
}
