import Link from "next/link";
import { Users, UserCheck, UserX, Wallet, AlarmClock, Search } from "lucide-react";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { NewClientWizard } from "@/modules/clients/client-wizard";
import { createClient } from "@/modules/clients/actions";

const compactCurrency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const FINISHED_STAGES = ["Concluído", "Cancelado"];

type Alert = "pagamentos" | "prazos";
type Sort = "nome" | "tarefas" | "recebido";

function Kpi({ value, label, icon: Icon }: { value: number; label: string; icon: typeof Users }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-2xl font-bold leading-none text-ink">{value}</p>
        <p className="mt-1 text-xs text-muted">{label}</p>
      </div>
    </div>
  );
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; alerta?: string; ordem?: string; novo?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const q = searchParams.q?.trim().toLowerCase();
  const status = searchParams.status;
  const alerta = searchParams.alerta as Alert | undefined;
  const ordem = (searchParams.ordem as Sort | undefined) ?? "nome";
  const canWrite = user.role === "ADMIN" || user.role === "GESTOR";
  const now = new Date();

  const [allClients, owners] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId: user.tenantId },
      include: {
        owner: { select: { name: true } },
        processes: {
          select: {
            dueAt: true,
            stage: { select: { label: true } },
            installments: { select: { value: true, paymentDueDate: true, paidAt: true } },
          },
        },
      },
    }),
    canWrite
      ? prisma.user.findMany({
          where: { tenantId: user.tenantId, role: { name: { not: "CLIENTE" } }, active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const rows = allClients.map((c) => {
    const installments = c.processes.flatMap((p) => p.installments);
    const received = installments.filter((i) => i.paidAt).reduce((sum, i) => sum + Number(i.value), 0);
    const pending = installments.filter((i) => !i.paidAt).reduce((sum, i) => sum + Number(i.value), 0);
    const hasLatePayment = installments.some((i) => !i.paidAt && i.paymentDueDate && i.paymentDueDate < now);
    const hasLateTask = c.processes.some((p) => p.dueAt && p.dueAt < now && !FINISHED_STAGES.includes(p.stage.label));
    return {
      id: c.id,
      name: c.name,
      fantasyName: c.fantasyName,
      status: c.status,
      ownerName: c.owner?.name ?? null,
      tasks: c.processes.length,
      received,
      pending,
      hasLatePayment,
      hasLateTask,
      search: `${c.name} ${c.fantasyName ?? ""} ${c.doc ?? ""} ${c.email ?? ""}`.toLowerCase(),
    };
  });

  const kpis = {
    total: rows.length,
    ativos: rows.filter((r) => r.status === "ativo").length,
    inativos: rows.filter((r) => r.status !== "ativo").length,
    pagamentosAtrasados: rows.filter((r) => r.hasLatePayment).length,
    prazosVencidos: rows.filter((r) => r.hasLateTask).length,
  };

  const visible = rows
    .filter((r) => (status ? r.status === status : true))
    .filter((r) => (q ? r.search.includes(q) : true))
    .filter((r) => (alerta === "pagamentos" ? r.hasLatePayment : alerta === "prazos" ? r.hasLateTask : true))
    .sort((a, b) =>
      ordem === "tarefas" ? b.tasks - a.tasks : ordem === "recebido" ? b.received - a.received : a.name.localeCompare(b.name, "pt-BR")
    );

  const alertLink = (value: Alert) => ({
    pathname: "/clientes",
    query: {
      ...(alerta === value ? {} : { alerta: value }),
      ...(status ? { status } : {}),
      ...(searchParams.q ? { q: searchParams.q } : {}),
    },
  });

  return (
    <div className="p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Clientes</h1>
          <p className="text-sm text-muted">Gerencie sua carteira de clientes</p>
        </div>
        {canWrite && <NewClientWizard owners={owners} onSubmit={createClient} autoOpen={searchParams.novo === "1"} />}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi value={kpis.total} label="Total" icon={Users} />
        <Kpi value={kpis.ativos} label="Ativos" icon={UserCheck} />
        <Kpi value={kpis.inativos} label="Inativos" icon={UserX} />
        <Kpi value={visible.length} label="Exibindo" icon={Search} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          href={alertLink("pagamentos")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            alerta === "pagamentos" ? "border-red-300 bg-red-50 text-red-700" : "border-border bg-surface text-muted hover:text-ink"
          }`}
        >
          <Wallet className="h-3.5 w-3.5 text-red-500" /> Pagamentos atrasados
          <span className="rounded-full bg-red-100 px-1.5 text-red-600">{kpis.pagamentosAtrasados}</span>
        </Link>
        <Link
          href={alertLink("prazos")}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            alerta === "prazos" ? "border-red-300 bg-red-50 text-red-700" : "border-border bg-surface text-muted hover:text-ink"
          }`}
        >
          <AlarmClock className="h-3.5 w-3.5 text-red-500" /> Prazos vencidos
          <span className="rounded-full bg-red-100 px-1.5 text-red-600">{kpis.prazosVencidos}</span>
        </Link>
      </div>

      <form className="mt-4 flex flex-wrap gap-3" method="get">
        {alerta && <input type="hidden" name="alerta" value={alerta} />}
        <Input name="q" defaultValue={searchParams.q} placeholder="Buscar por nome, documento ou e-mail..." className="max-w-sm" />
        <Select name="status" defaultValue={status ?? ""} className="max-w-[160px]">
          <option value="">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </Select>
        <Select name="ordem" defaultValue={ordem} className="max-w-[170px]">
          <option value="nome">Nome (A-Z)</option>
          <option value="tarefas">Mais tarefas</option>
          <option value="recebido">Maior recebido</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      {visible.length === 0 ? (
        <p className="mt-10 text-center text-muted-soft">Nenhum cliente encontrado.</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="group rounded-2xl border border-border/70 bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent-soft text-sm font-bold text-accent">
                  {c.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink group-hover:text-accent">{c.name}</p>
                  <p className="truncate text-xs text-muted-soft">{c.fantasyName ?? c.ownerName ?? "—"}</p>
                </div>
                <Badge variant={c.status === "ativo" ? "success" : "neutral"}>{c.status === "ativo" ? "Ativo" : "Inativo"}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                <div>
                  <p className="text-base font-bold text-ink">{c.tasks}</p>
                  <p className="text-[11px] text-muted">Tarefas</p>
                </div>
                <div>
                  <p className="text-base font-bold text-emerald-600">{compactCurrency.format(c.received)}</p>
                  <p className="text-[11px] text-muted">Recebido</p>
                </div>
                <div>
                  <p className={`text-base font-bold ${c.hasLatePayment ? "text-red-600" : "text-ink"}`}>
                    {compactCurrency.format(c.pending)}
                  </p>
                  <p className="text-[11px] text-muted">Pendente</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
