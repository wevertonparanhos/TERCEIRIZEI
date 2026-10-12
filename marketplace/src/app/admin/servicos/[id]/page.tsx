import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { ServiceAddon, ServicePackage } from "@prisma/client";
import { ActionForm } from "@/components/action-form";
import { Input, Select, Textarea } from "@/components/ui/form";
import { Badge, Card, Notice, PageHeader } from "@/components/ui/surface";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";
import { saveAddonAction, savePackageAction, updateServiceAction } from "../../actions";

function PackageFields({ serviceId, p }: { serviceId: string; p?: ServicePackage }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="serviceId" value={serviceId} />
      {p ? <input type="hidden" name="packageId" value={p.id} /> : null}
      <label className="text-sm sm:col-span-2">Nome<Input name="name" defaultValue={p?.name} required className="mt-1" /></label>
      <label className="text-sm sm:col-span-2">Slug<Input name="slug" defaultValue={p?.slug} required className="mt-1" /></label>
      <label className="text-sm sm:col-span-4">Descrição<Textarea name="description" defaultValue={p?.description} rows={2} className="mt-1" /></label>
      <label className="text-sm">Duração (min)<Input name="durationMinutes" type="number" min={15} defaultValue={p?.durationMinutes ?? 240} className="mt-1" /></label>
      <label className="text-sm">Profissionais<Input name="professionals" type="number" min={1} defaultValue={p?.professionals ?? 1} className="mt-1" /></label>
      <label className="text-sm">Quartos<Input name="bedrooms" type="number" min={0} defaultValue={p?.bedrooms ?? ""} className="mt-1" /></label>
      <label className="text-sm">Banheiros<Input name="bathrooms" type="number" min={0} defaultValue={p?.bathrooms ?? ""} className="mt-1" /></label>
      <label className="text-sm">Área máx. (m²)<Input name="maxAreaM2" type="number" min={1} defaultValue={p?.maxAreaM2 ?? ""} className="mt-1" /></label>
      <label className="text-sm">Ordem<Input name="sortOrder" type="number" min={0} defaultValue={p?.sortOrder ?? 0} className="mt-1" /></label>
      <label className="text-sm sm:col-span-2">
        Materiais por conta de
        <Select name="suppliesBy" defaultValue={p?.suppliesBy ?? "CUSTOMER"} className="mt-1">
          <option value="CUSTOMER">Cliente</option>
          <option value="PROVIDER">Profissional</option>
          <option value="SHARED">Combinado</option>
        </Select>
      </label>
      <label className="text-sm sm:col-span-2">Itens inclusos (um por linha)<Textarea name="includedItems" defaultValue={p?.includedItems.join("\n")} rows={5} className="mt-1" /></label>
      <label className="text-sm sm:col-span-2">Itens não inclusos (um por linha)<Textarea name="excludedItems" defaultValue={p?.excludedItems.join("\n")} rows={5} className="mt-1" /></label>
      <label className="text-sm sm:col-span-2">Observação sobre materiais<Input name="suppliesNote" defaultValue={p?.suppliesNote ?? ""} className="mt-1" /></label>
      <label className="text-sm sm:col-span-2">Condições para contratação<Input name="conditions" defaultValue={p?.conditions ?? ""} className="mt-1" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="size-4" /> Ativo</label>
    </div>
  );
}

function AddonFields({ serviceId, a }: { serviceId: string; a?: ServiceAddon }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <input type="hidden" name="serviceId" value={serviceId} />
      {a ? <input type="hidden" name="addonId" value={a.id} /> : null}
      <label className="text-sm sm:col-span-2">Nome<Input name="name" defaultValue={a?.name} required className="mt-1" /></label>
      <label className="text-sm sm:col-span-2">Descrição<Input name="description" defaultValue={a?.description ?? ""} className="mt-1" /></label>
      <label className="text-sm">
        Cobrança
        <Select name="pricing" defaultValue={a?.pricing ?? "FIXED"} className="mt-1">
          <option value="FIXED">Valor fixo</option>
          <option value="PER_UNIT">Por unidade</option>
        </Select>
      </label>
      <label className="text-sm">Unidade<Input name="unitLabel" defaultValue={a?.unitLabel ?? ""} placeholder="janela" className="mt-1" /></label>
      <label className="text-sm">Qtd. máxima<Input name="maxQuantity" type="number" min={1} defaultValue={a?.maxQuantity ?? 1} className="mt-1" /></label>
      <label className="text-sm">Minutos extras<Input name="durationMinutes" type="number" min={0} defaultValue={a?.durationMinutes ?? 0} className="mt-1" /></label>
      <label className="text-sm">Ordem<Input name="sortOrder" type="number" min={0} defaultValue={a?.sortOrder ?? 0} className="mt-1" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={a?.active ?? true} className="size-4" /> Ativo</label>
    </div>
  );
}

export default async function AdminServiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePagePermission("admin:catalog:manage", `/admin/servicos/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const service = await db.service.findUnique({
    where: { id },
    include: {
      category: true,
      packages: { orderBy: { sortOrder: "asc" } },
      addons: { orderBy: { sortOrder: "asc" } },
      priceRules: true,
    },
  });
  if (!service) notFound();

  return (
    <>
      <nav className="mb-4 flex items-center gap-1 text-sm text-muted">
        <Link href="/admin/servicos" className="hover:text-ink">Serviços</Link>
        <ChevronRight className="size-4" aria-hidden />
        <span className="text-ink">{service.name}</span>
      </nav>
      <PageHeader title={service.name} description={`${service.category.name} · ${service.published ? "Publicado" : "Rascunho"}`} />

      <div className="mb-6">
        <Notice>Alterações de escopo valem para novos pedidos. Pedidos existentes guardam uma cópia (snapshot) do que foi contratado.</Notice>
      </div>

      <Card className="mb-8 p-5">
        <h2 className="mb-4 font-semibold">Dados do serviço</h2>
        <ActionForm action={updateServiceAction} submitLabel="Salvar serviço" footerClassName="flex justify-end">
          <input type="hidden" name="serviceId" value={service.id} />
          <div className="grid gap-3">
            <label className="text-sm">Nome<Input name="name" defaultValue={service.name} className="mt-1" /></label>
            <label className="text-sm">Resumo<Input name="summary" defaultValue={service.summary ?? ""} className="mt-1" /></label>
            <label className="text-sm">Descrição<Textarea name="description" defaultValue={service.description ?? ""} rows={3} className="mt-1" /></label>
          </div>
        </ActionForm>
      </Card>

      {service.pricingModel === "FIXED" && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Pacotes</h2>
          <div className="space-y-3">
            {service.packages.map((p) => (
              <Card key={p.id} className="p-4">
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between">
                    <span className="font-medium">{p.name}</span>
                    <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                  </summary>
                  <ActionForm action={savePackageAction} submitLabel="Salvar pacote" className="mt-4 border-t border-line pt-4" footerClassName="flex justify-end">
                    <PackageFields serviceId={service.id} p={p} />
                  </ActionForm>
                </details>
              </Card>
            ))}
            <Card className="p-4">
              <details>
                <summary className="cursor-pointer font-medium text-brand">+ Novo pacote</summary>
                <ActionForm action={savePackageAction} submitLabel="Criar pacote" className="mt-4 border-t border-line pt-4" footerClassName="flex justify-end">
                  <PackageFields serviceId={service.id} />
                </ActionForm>
              </details>
            </Card>
          </div>
        </section>
      )}

      {service.pricingModel === "CALCULATED" && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Unidades de cálculo</h2>
          <Card className="divide-y divide-line">
            {service.priceRules.map((r) => (
              <p key={r.id} className="p-4 text-sm">
                <span className="font-medium">{r.name}</span> — por {r.unitLabel}, de {r.minQuantity} a {r.maxQuantity}
              </p>
            ))}
          </Card>
        </section>
      )}

      {service.pricingModel !== "QUOTE" && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Adicionais</h2>
          <div className="space-y-3">
            {service.addons.map((a) => (
              <Card key={a.id} className="p-4">
                <details>
                  <summary className="flex cursor-pointer list-none items-center justify-between">
                    <span className="font-medium">{a.name}</span>
                    <Badge tone={a.active ? "success" : "neutral"}>{a.active ? "Ativo" : "Inativo"}</Badge>
                  </summary>
                  <ActionForm action={saveAddonAction} submitLabel="Salvar adicional" className="mt-4 border-t border-line pt-4" footerClassName="flex justify-end">
                    <AddonFields serviceId={service.id} a={a} />
                  </ActionForm>
                </details>
              </Card>
            ))}
            <Card className="p-4">
              <details>
                <summary className="cursor-pointer font-medium text-brand">+ Novo adicional</summary>
                <ActionForm action={saveAddonAction} submitLabel="Criar adicional" className="mt-4 border-t border-line pt-4" footerClassName="flex justify-end">
                  <AddonFields serviceId={service.id} />
                </ActionForm>
              </details>
            </Card>
          </div>
        </section>
      )}
    </>
  );
}
