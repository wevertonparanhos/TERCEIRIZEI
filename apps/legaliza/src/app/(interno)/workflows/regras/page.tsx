import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { RuleList } from "@/modules/workflows/rule-list";

export default async function RulesPage() {
  const user = await requireRole("TENANT_ADMIN");

  const [rules, workflows] = await Promise.all([
    prisma.rule.findMany({
      where: { tenantId: user.tenantId! },
      include: { workflow: { select: { name: true } } },
      orderBy: { priority: "desc" },
    }),
    prisma.workflow.findMany({
      where: { tenantId: user.tenantId!, active: true },
      select: { id: true, name: true, processType: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Regras</h1>
      <p className="mb-6 text-sm text-muted">
        Decidem qual Workflow um processo novo usa, por tipo + UF + natureza jurídica. Sem regra correspondente, o
        processo nasce sem etapas.
      </p>
      <RuleList rules={rules} workflows={workflows} />
    </div>
  );
}
