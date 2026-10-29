import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma, type DemandPriority } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { PRIORITY_LABELS, PRIORITY_BADGE_VARIANT } from "@/modules/processes/labels";
import { RequestsList, type RequestItem } from "@/modules/portal/requests-list";

const FILTERS = [
  { key: "pendentes", label: "Para revisar", status: "PENDENTE" },
  { key: "importados", label: "Importados", status: "IMPORTADO" },
  { key: "recusados", label: "Recusados", status: "RECUSADO" },
  { key: "todos", label: "Todos", status: null },
] as const;

const dateTimeBR = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function PedidosDoPortalPage({ searchParams }: { searchParams: { filtro?: string; prioridade?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) redirect("/dashboard");

  const filter = FILTERS.find((f) => f.key === searchParams.filtro) ?? FILTERS[0];
  const priority: DemandPriority | null = Object.keys(PRIORITY_LABELS).includes(searchParams.prioridade ?? "") ? (searchParams.prioridade as DemandPriority) : null;

  const [rows, counts, workspaces] = await Promise.all([
    prisma.portalRequest.findMany({
      where: { tenantId: user.tenantId, ...(filter.status ? { status: filter.status } : {}), ...(priority ? { priority } : {}) },
      orderBy: { createdAt: filter.status === "PENDENTE" ? "asc" : "desc" },
      take: 200,
      include: {
        client: { select: { name: true } },
        company: { select: { razaoSocial: true } },
        serviceType: { select: { name: true } },
        documents: { select: { id: true, name: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.portalRequest.groupBy({ by: ["status"], where: { tenantId: user.tenantId }, _count: { _all: true } }),
    prisma.workspace.findMany({ where: { tenantId: user.tenantId }, orderBy: { position: "asc" }, select: { id: true, name: true } }),
  ]);

  const countOf = (status: string | null) => (status ? counts.find((c) => c.status === status)?._count._all ?? 0 : counts.reduce((s, c) => s + c._count._all, 0));

  const items: RequestItem[] = rows.map((r) => ({
    id: r.id,
    status: r.status as RequestItem["status"],
    clientId: r.clientId,
    clientName: r.client.name,
    companyName: r.company?.razaoSocial ?? null,
    service: r.serviceType.name,
    priority: PRIORITY_LABELS[r.priority],
    priorityVariant: PRIORITY_BADGE_VARIANT[r.priority],
    deadline: r.requestedDeadline ? r.requestedDeadline.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : null,
    description: r.description,
    answers: Array.isArray(r.answers) ? (r.answers as { label: string; value: string }[]) : [],
    attachments: r.documents.map((d) => ({ id: d.id, name: d.name })),
    createdAt: dateTimeBR(r.createdAt),
    reviewNote: r.reviewNote,
    processId: r.processId,
  }));

  const query = (key: string, prio: string | null) => `/pedidos?filtro=${key}${prio ? `&prioridade=${prio}` : ""}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Pedidos do Portal</h1>
        <p className="text-sm text-muted">Pedidos que os clientes enviam pelo portal. Importe como tarefa ou recuse com um motivo.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={query(f.key, priority)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              f.key === filter.key ? "bg-accent text-white shadow-sm" : "border border-border bg-surface text-muted hover:bg-surface-alt hover:text-ink"
            }`}
          >
            {f.label} <span className="opacity-80">{countOf(f.status)}</span>
          </Link>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />
        <form method="get" action="/pedidos" className="flex items-center gap-2">
          <input type="hidden" name="filtro" value={filter.key} />
          <select
            name="prioridade"
            defaultValue={priority ?? ""}
            aria-label="Filtrar por prioridade"
            className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm text-ink"
          >
            <option value="">Todas as prioridades</option>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-lg border border-border-strong bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-alt">
            Filtrar
          </button>
        </form>
      </div>

      <RequestsList items={items} workspaces={workspaces} />
    </div>
  );
}
