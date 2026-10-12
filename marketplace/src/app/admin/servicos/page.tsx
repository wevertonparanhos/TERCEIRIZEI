import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, PageHeader } from "@/components/ui/surface";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";
import { toggleServicePublishedAction } from "../actions";

const MODEL = { FIXED: "Preço fixo", CALCULATED: "Calculado", QUOTE: "Orçamento" } as const;

export default async function AdminServicesPage() {
  await requirePagePermission("admin:catalog:manage", "/admin/servicos");
  const categories = await db.serviceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { packages: true, addons: true, offers: { where: { active: true } } } } },
      },
    },
  });

  return (
    <>
      <PageHeader title="Serviços e pacotes" description="Defina o escopo padronizado. Os preços são definidos por cada profissional." />
      <div className="space-y-6">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{cat.name}</h2>
            <Card className="divide-y divide-line">
              {cat.services.length === 0 ? <p className="p-4 text-sm text-muted">Nenhum serviço.</p> : null}
              {cat.services.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <Link href={`/admin/servicos/${s.id}`} className="font-medium hover:text-brand">{s.name}</Link>
                    <p className="text-xs text-muted">
                      {MODEL[s.pricingModel]} · {s._count.packages} pacotes · {s._count.addons} adicionais · {s._count.offers} preços de profissionais
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge tone={s.published ? "success" : "neutral"}>{s.published ? "Publicado" : "Rascunho"}</Badge>
                    <ActionForm
                      action={toggleServicePublishedAction}
                      submitLabel={s.published ? "Despublicar" : "Publicar"}
                      variant="secondary"
                      confirm={s.published ? "Retirar este serviço do ar? Clientes deixarão de vê-lo." : undefined}
                      className="space-y-0"
                    >
                      <input type="hidden" name="serviceId" value={s.id} />
                      <input type="hidden" name="published" value={s.published ? "false" : "true"} />
                    </ActionForm>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </>
  );
}
