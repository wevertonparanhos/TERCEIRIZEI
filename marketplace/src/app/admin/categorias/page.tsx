import { ActionForm } from "@/components/action-form";
import { CategoryIcon } from "@/components/category-icon";
import { Input, Textarea } from "@/components/ui/form";
import { Badge, Card, PageHeader } from "@/components/ui/surface";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";
import { saveCategoryAction } from "../actions";

type Category = Awaited<ReturnType<typeof db.serviceCategory.findMany>>[number];

function CategoryFields({ c }: { c?: Category }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {c ? <input type="hidden" name="id" value={c.id} /> : null}
      <label className="text-sm">Nome<Input name="name" defaultValue={c?.name} required className="mt-1" /></label>
      <label className="text-sm">Endereço (slug)<Input name="slug" defaultValue={c?.slug} required className="mt-1" /></label>
      <label className="text-sm sm:col-span-2">Descrição<Textarea name="description" defaultValue={c?.description ?? ""} rows={2} className="mt-1" /></label>
      <label className="text-sm">Ícone<Input name="icon" defaultValue={c?.icon ?? ""} placeholder="sparkles, wrench, zap…" className="mt-1" /></label>
      <label className="text-sm">Ordem<Input name="sortOrder" type="number" min={0} defaultValue={c?.sortOrder ?? 0} className="mt-1" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="size-4" /> Ativa</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiresQualification" defaultChecked={c?.requiresQualification ?? false} className="size-4" /> Exige qualificação comprovada</label>
      <label className="text-sm sm:col-span-2">Requisito de qualificação<Textarea name="qualificationNote" defaultValue={c?.qualificationNote ?? ""} rows={2} className="mt-1" /></label>
    </div>
  );
}

export default async function AdminCategoriesPage() {
  await requirePagePermission("admin:catalog:manage", "/admin/categorias");
  const categories = await db.serviceCategory.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <>
      <PageHeader title="Categorias" description="Novas categorias entram no catálogo sem mudança de código." />

      <div className="space-y-3">
        {categories.map((c) => (
          <Card key={c.id} className="p-4">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand"><CategoryIcon name={c.icon} className="size-4" /></span>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted">/{c.slug}</span>
                </span>
                <span className="flex gap-2">
                  {c.requiresQualification ? <Badge tone="brand">Qualificação</Badge> : null}
                  <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Ativa" : "Inativa"}</Badge>
                </span>
              </summary>
              <ActionForm action={saveCategoryAction} submitLabel="Salvar categoria" className="mt-4 border-t border-line pt-4" footerClassName="flex justify-end">
                <CategoryFields c={c} />
              </ActionForm>
            </details>
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-5">
        <h2 className="mb-4 font-semibold">Nova categoria</h2>
        <ActionForm action={saveCategoryAction} submitLabel="Criar categoria" footerClassName="flex justify-end">
          <CategoryFields />
        </ActionForm>
      </Card>
    </>
  );
}
