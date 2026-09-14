import { prisma } from "@legaliza/db";
import { requireRole } from "@/lib/rbac";
import { TemplateList } from "@/modules/document-templates/template-list";

export default async function TemplatesPage() {
  const user = await requireRole("TENANT_ADMIN");

  const templates = await prisma.documentTemplate.findMany({
    where: { tenantId: user.tenantId! },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-ink">Modelos de Documento</h1>
      <p className="mb-6 text-sm text-muted">
        Envie os modelos (.docx) que seu escritório já usa — o LEGALIZA.AI só preenche as variáveis, não escreve
        conteúdo jurídico.
      </p>
      <TemplateList
        templates={templates.map((t) => ({ id: t.id, name: t.name, category: t.category, description: t.description }))}
      />
    </div>
  );
}
