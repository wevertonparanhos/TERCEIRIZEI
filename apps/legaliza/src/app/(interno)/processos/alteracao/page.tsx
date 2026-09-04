import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { AmendmentWizard } from "@/modules/processes/amendment-wizard";

export default async function AmendmentWizardPage() {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId! },
    select: { id: true, name: true, companies: { select: { id: true, legalName: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Assistente de Alteração</h1>
      <p className="mb-6 text-sm text-muted">
        Marque o que está mudando na empresa — o processo nasce com um checklist pra cada item. A edição de verdade
        (endereço, sócios, CNAEs, dados da empresa) acontece na tela da própria empresa.
      </p>
      <div className="rounded-lg border border-border bg-surface p-6">
        <AmendmentWizard clients={clients} />
      </div>
    </div>
  );
}
