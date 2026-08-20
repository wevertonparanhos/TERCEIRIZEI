import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { ServiceTypeForm } from "@/modules/service-types/service-type-form";
import { ChecklistTemplateManager } from "@/modules/service-types/checklist-template-manager";
import { ActiveToggle } from "@/modules/service-types/active-toggle";
import {
  updateServiceType,
  toggleServiceTypeActive,
  addChecklistTemplateItem,
  removeChecklistTemplateItem,
  moveChecklistTemplateItem,
} from "@/modules/service-types/actions";

export default async function ServicoDetalhePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/processos");

  const serviceType = await prisma.serviceType.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { checklistTemplate: { orderBy: { position: "asc" } } },
  });
  if (!serviceType) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div>
        <Link href="/servicos" className="text-sm text-accent hover:underline">
          ← Voltar para Modelos de Processo
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-ink">{serviceType.name}</h1>
          {!serviceType.active && <Badge variant="neutral">Inativo</Badge>}
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <ServiceTypeForm
          submitLabel="Salvar alterações"
          defaultValues={{
            name: serviceType.name,
            defaultPrice: serviceType.defaultPrice ? String(serviceType.defaultPrice) : "",
            defaultDeadlineDays: serviceType.defaultDeadlineDays ? String(serviceType.defaultDeadlineDays) : "",
            defaultPriority: serviceType.defaultPriority ?? "",
            defaultNotes: serviceType.defaultNotes ?? "",
          }}
          onSubmit={updateServiceType.bind(null, serviceType.id)}
        />
        <div className="mt-4 border-t border-border pt-4">
          <ActiveToggle serviceTypeId={serviceType.id} active={serviceType.active} toggleActive={toggleServiceTypeActive} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <ChecklistTemplateManager
          serviceTypeId={serviceType.id}
          items={serviceType.checklistTemplate.map((i) => ({ id: i.id, label: i.label }))}
          addItem={addChecklistTemplateItem}
          removeItem={removeChecklistTemplateItem}
          moveItem={moveChecklistTemplateItem}
        />
      </div>
    </div>
  );
}
