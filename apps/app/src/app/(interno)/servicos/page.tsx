import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function ServicosPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/processos");

  const serviceTypes = await prisma.serviceType.findMany({
    where: { tenantId: user.tenantId },
    include: { _count: { select: { checklistTemplate: true, processes: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Modelos de Processo</h1>
          <p className="text-sm text-slate-500">
            Tipos de serviço com valor, prazo, prioridade e checklist padrão — aplicados automaticamente na abertura
            de um novo processo, mas sempre ajustáveis caso a caso.
          </p>
        </div>
        <Link
          href="/servicos/novo"
          className="rounded-md bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Novo Modelo
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-100">
          {serviceTypes.map((st) => (
            <li key={st.id}>
              <Link href={`/servicos/${st.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                <span className="flex-1 text-sm font-medium text-brand-navy">{st.name}</span>
                {!st.active && <Badge variant="neutral">Inativo</Badge>}
                <span className="text-xs text-slate-400">
                  {st.defaultPrice ? currencyFormatter.format(Number(st.defaultPrice)) : "sem valor padrão"}
                  {st.defaultDeadlineDays ? ` · ${st.defaultDeadlineDays}d` : ""}
                  {st._count.checklistTemplate > 0 ? ` · ${st._count.checklistTemplate} item(s) de checklist` : ""}
                </span>
                <span className="text-xs text-slate-400">{st._count.processes} processo(s)</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
