import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ProcessCreateForm } from "@/modules/processes/process-create-form";
import { createProcess } from "@/modules/processes/actions";

export default async function NovoProcessoPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN" && user.role !== "GESTOR") redirect("/processos");

  const [clients, companies, serviceTypes] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId: user.tenantId, status: "ativo" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, clientId: true, razaoSocial: true },
    }),
    prisma.serviceType.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: {
        id: true,
        name: true,
        defaultPrice: true,
        defaultDeadlineDays: true,
        defaultPriority: true,
        _count: { select: { checklistTemplate: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/processos" className="text-sm text-accent hover:underline">
        ← Voltar para Processos
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">Novo Processo</h1>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <ProcessCreateForm
          clients={clients}
          companies={companies}
          serviceTypes={serviceTypes.map((st) => ({
            id: st.id,
            name: st.name,
            defaultPrice: st.defaultPrice ? String(st.defaultPrice) : null,
            defaultDeadlineDays: st.defaultDeadlineDays,
            defaultPriority: st.defaultPriority,
            checklistCount: st._count.checklistTemplate,
          }))}
          onSubmit={createProcess}
        />
      </div>
    </div>
  );
}
