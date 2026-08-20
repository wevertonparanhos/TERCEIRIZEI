import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ClientProcessForm } from "@/modules/processes/client-process-form";
import { clientCreateProcess } from "@/modules/processes/actions";

export default async function PortalNovaDemandaPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const [companies, serviceTypes] = await Promise.all([
    prisma.company.findMany({ where: { clientId: user.clientId }, select: { id: true, razaoSocial: true } }),
    prisma.serviceType.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold text-brand-navy">Nova Demanda</h1>
      <p className="mt-1 text-sm text-slate-500">
        Conte pra gente o que você precisa — nossa equipe vai analisar e entrar em contato.
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <ClientProcessForm companies={companies} serviceTypes={serviceTypes} onSubmit={clientCreateProcess} />
      </div>
    </div>
  );
}
