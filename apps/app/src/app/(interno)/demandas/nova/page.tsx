import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { DemandForm } from "@/modules/demands/demand-form";
import { createDemand } from "@/modules/demands/actions";

export default async function NovaDemandaPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN" && user.role !== "GESTOR") redirect("/demandas");

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
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/demandas" className="text-sm text-brand-blue hover:underline">
        ← Voltar para Demandas
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-brand-navy">Nova Demanda</h1>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <DemandForm clients={clients} companies={companies} serviceTypes={serviceTypes} onSubmit={createDemand} />
      </div>
    </div>
  );
}
