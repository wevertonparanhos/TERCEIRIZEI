import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { OpeningWizard } from "@/modules/processes/opening-wizard";

export default async function OpeningWizardPage() {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId! },
    select: { id: true, name: true, doc: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Assistente de Abertura de Empresa</h1>
      <p className="mb-6 text-sm text-muted">
        Cria cliente (se novo), empresa, sócios, atividades, endereço e o processo de abertura numa experiência só.
      </p>
      <OpeningWizard clients={clients} />
    </div>
  );
}
