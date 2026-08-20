import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const ENTITY_TYPE_LABELS: Record<string, string> = {
  client: "Cliente",
  demand: "Demanda",
  process: "Processo",
  document: "Documento",
  document_request: "Solicitação de documento",
  invoice: "Fatura",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: { entityType?: string; from?: string; to?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: user.tenantId,
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
    <div className="p-8">
      <h1 className="text-2xl font-bold text-brand-navy">Auditoria</h1>
      <p className="text-sm text-slate-500">
        Trilha das ações mais sensíveis do sistema — últimos {logs.length} registro(s).
      </p>

      <form className="mt-6 flex flex-wrap gap-3" method="get">
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
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <input
          type="date"
          name="to"
          defaultValue={searchParams.to ?? ""}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Data/Hora</th>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                  {log.createdAt.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-slate-600">{log.user?.name ?? "Sistema"}</td>
                <td className="px-4 py-3 text-slate-600">{ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType}</td>
                <td className="px-4 py-3 text-slate-700">{log.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
