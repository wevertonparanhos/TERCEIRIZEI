import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { ProcessForm } from "@/modules/processes/process-form";

export default async function NewProcessPage() {
  const user = await requireRole("TENANT_ADMIN", "OPERATOR");

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId! },
    select: { id: true, name: true, companies: { select: { id: true, legalName: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink">Novo Processo</h1>
      <div className="rounded-lg border border-border bg-surface p-6">
        <ProcessForm clients={clients} />
      </div>
    </div>
  );
}
