import { BadgeCheck } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice, PageHeader } from "@/components/ui/surface";
import { resolveCommission } from "@/domain/commission";
import { formatBps } from "@/domain/money";
import { centsToInput, formatMinutes } from "@/lib/utils";
import { requirePageRole } from "@/server/auth";
import { getActiveCommissionRules } from "@/server/catalog";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { toggleCategoryAction } from "../actions";
import { OfferForm, type OfferItem } from "./offer-form";

export default async function ProviderServicesPage() {
  const user = await requirePageRole(["PROVIDER"], "/profissional/servicos");
  const provider = await db.providerProfile.findUniqueOrThrow({
    where: { userId: user.id },
    include: { categories: true, offers: true },
  });

  const [categories, rules, settings] = await Promise.all([
    db.serviceCategory.findMany({
      where: { active: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      include: {
        services: {
          where: { active: true, published: true },
          orderBy: { sortOrder: "asc" },
          include: {
            packages: { where: { active: true }, orderBy: { sortOrder: "asc" } },
            addons: { where: { active: true }, orderBy: { sortOrder: "asc" } },
            priceRules: { where: { active: true } },
          },
        },
      },
    }),
    getActiveCommissionRules(),
    getSettings(),
  ]);

  const enrolled = new Set(provider.categories.map((c) => c.categoryId));
  const offerOf = (field: "packageId" | "addonId" | "priceRuleId", id: string) =>
    provider.offers.find((o) => o[field] === id && o.active);

  return (
    <>
      <PageHeader
        title="Serviços e preços"
        description="Escolha as categorias que você atende e defina o seu preço para cada pacote."
      />
      <div className="mb-6">
        <Notice title="Como o preço chega ao cliente">
          {settings.commissionMode === "ON_TOP"
            ? "O cliente paga o seu preço + a taxa de serviço da plataforma. Você recebe o valor integral que definiu (descontadas apenas eventuais taxas do meio de pagamento, quando aplicáveis e informadas)."
            : "A taxa de serviço da plataforma é descontada do seu preço."}
        </Notice>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const active = enrolled.has(category.id);
          return (
            <Card key={category.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl ${active ? "bg-brand text-brand-ink" : "bg-ink/5 text-ink-soft"}`}>
                    <CategoryIcon name={category.icon} className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold">{category.name}</p>
                    {category.requiresQualification ? (
                      <p className="flex items-center gap-1 text-xs text-muted">
                        <BadgeCheck className="size-3.5" aria-hidden /> Exige qualificação comprovada
                      </p>
                    ) : null}
                  </div>
                </div>
                <form action={toggleCategoryAction}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input type="hidden" name="enabled" value={active ? "false" : "true"} />
                  <Button type="submit" size="sm" variant={active ? "secondary" : "primary"}>
                    {active ? "Deixar de atender" : "Atender esta categoria"}
                  </Button>
                </form>
              </div>

              {active ? (
                <div className="mt-6 space-y-8">
                  {category.services.length === 0 ? (
                    <p className="text-sm text-muted">Nenhum serviço publicado nesta categoria ainda.</p>
                  ) : null}
                  {category.services.map((service) => {
                    const { rateBps } = resolveCommission(rules, { categoryId: category.id, serviceId: service.id, at: new Date() });
                    if (service.pricingModel === "QUOTE") {
                      return (
                        <div key={service.id} className="border-t border-line pt-6">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{service.name}</p>
                            <Badge tone="highlight">Sob orçamento</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted">
                            Você receberá pedidos de orçamento desta categoria e enviará propostas caso a caso (próxima etapa).
                          </p>
                        </div>
                      );
                    }
                    const items: OfferItem[] = [
                      ...service.packages.map((p) => ({
                        id: p.id,
                        kind: "PACKAGE" as const,
                        name: p.name,
                        detail: `${formatMinutes(p.durationMinutes)} · ${p.professionals} ${p.professionals === 1 ? "profissional" : "profissionais"}`,
                        price: centsToInput(offerOf("packageId", p.id)?.priceCents),
                      })),
                      ...service.priceRules.map((r) => {
                        const o = offerOf("priceRuleId", r.id);
                        return {
                          id: r.id,
                          kind: "RULE" as const,
                          name: `${r.name} (por ${r.unitLabel})`,
                          detail: `Cliente informa de ${r.minQuantity} a ${r.maxQuantity} ${r.unitLabel}`,
                          unitLabel: r.unitLabel,
                          price: centsToInput(o?.priceCents),
                          base: centsToInput(o?.baseCents),
                          min: centsToInput(o?.minTotalCents),
                        };
                      }),
                      ...service.addons.map((a) => ({
                        id: a.id,
                        kind: "ADDON" as const,
                        name: a.name,
                        detail: a.pricing === "PER_UNIT" && a.unitLabel ? `Preço por ${a.unitLabel}` : a.description ?? undefined,
                        unitLabel: a.pricing === "PER_UNIT" ? a.unitLabel : null,
                        price: centsToInput(offerOf("addonId", a.id)?.priceCents),
                      })),
                    ];
                    return (
                      <div key={service.id} className="border-t border-line pt-6">
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{service.name}</p>
                          <Badge>Taxa da plataforma {formatBps(rateBps)}</Badge>
                        </div>
                        <OfferForm serviceId={service.id} items={items} commissionRateBps={rateBps} commissionMode={settings.commissionMode} />
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </>
  );
}
