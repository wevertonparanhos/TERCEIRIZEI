import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, utcToLocalDate } from "@/domain/availability";
import { customerPrice } from "@/domain/pricing";
import { requirePageRole } from "@/server/auth";
import { getServiceDetail } from "@/server/catalog";
import { db } from "@/server/db";
import { listProvidersForService } from "@/server/reviews";
import { CheckoutWizard, type WizardProvider } from "./checkout-wizard";

export const metadata: Metadata = { title: "Contratar" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ profissional?: string }> };

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { profissional } = await searchParams;
  const user = await requirePageRole(["CUSTOMER"], `/contratar/${slug}${profissional ? `?profissional=${profissional}` : ""}`);

  const service = await getServiceDetail(slug);
  if (!service || service.pricingModel === "QUOTE") notFound();

  const ranked = await listProvidersForService(service.id);
  const providerIds = ranked.map((r) => r.provider.id);
  const [offers, areas, addresses] = await Promise.all([
    db.providerOffer.findMany({
      where: { providerId: { in: providerIds }, serviceId: service.id, active: true },
      select: { providerId: true, packageId: true, addonId: true, priceRuleId: true, priceCents: true, baseCents: true, minTotalCents: true },
    }),
    db.providerServiceArea.findMany({
      where: { providerId: { in: providerIds }, city: { active: true } },
      select: { providerId: true, neighborhoods: true, city: { select: { name: true, state: true } } },
    }),
    db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
  ]);

  // Preços já convertidos para o valor que o CLIENTE paga (com a taxa).
  const toCustomer = (cents: number) => customerPrice(cents, service.commissionRateBps, service.commissionMode);
  const providers: WizardProvider[] = ranked.map(({ provider }) => {
    const own = offers.filter((o) => o.providerId === provider.id);
    return {
      id: provider.id,
      name: provider.displayName,
      city: provider.baseCity ? `${provider.baseCity}/${provider.baseState}` : "",
      ratingSum: provider.ratingSum,
      ratingCount: provider.ratingCount,
      packages: Object.fromEntries(own.filter((o) => o.packageId).map((o) => [o.packageId!, toCustomer(o.priceCents)])),
      addons: Object.fromEntries(own.filter((o) => o.addonId).map((o) => [o.addonId!, toCustomer(o.priceCents)])),
      rules: Object.fromEntries(
        own.filter((o) => o.priceRuleId).map((o) => [o.priceRuleId!, { unit: toCustomer(o.priceCents), base: toCustomer(o.baseCents), min: toCustomer(o.minTotalCents) }]),
      ),
      areas: areas.filter((a) => a.providerId === provider.id).map((a) => ({ city: a.city.name, state: a.city.state, neighborhoods: a.neighborhoods })),
    };
  });

  const today = utcToLocalDate(new Date());
  const dates = Array.from({ length: 21 }, (_, i) => addDays(today, i));

  return (
    <div className="container-page max-w-5xl py-8">
      <Link href={`/servico/${service.slug}`} className="text-sm font-medium text-brand hover:underline">← {service.name}</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Contratar {service.name.toLowerCase()}</h1>
      <p className="mt-1 text-muted">Escolha o profissional, o que precisa e o melhor horário. Você vê o valor final antes de confirmar.</p>

      <CheckoutWizard
        service={{
          id: service.id,
          slug: service.slug,
          model: service.pricingModel as "FIXED" | "CALCULATED",
          packages: service.packages.map((p) => ({ id: p.id, name: p.name, description: p.description, durationMinutes: p.durationMinutes, bedrooms: p.bedrooms, bathrooms: p.bathrooms, maxAreaM2: p.maxAreaM2 })),
          addons: service.addons.map((a) => ({ id: a.id, name: a.name, description: a.description, pricing: a.pricing, unitLabel: a.unitLabel, maxQuantity: a.maxQuantity })),
          rules: service.priceRules.map((r) => ({ id: r.id, name: r.name, unitLabel: r.unitLabel, minQuantity: r.minQuantity, maxQuantity: r.maxQuantity })),
          cancellation: service.cancellationPolicy?.description ?? null,
        }}
        providers={providers}
        initialProviderId={providers.some((p) => p.id === profissional) ? profissional! : null}
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, line: `${a.street}, ${a.number}${a.complement ? ` – ${a.complement}` : ""} · ${a.neighborhood}`, neighborhood: a.neighborhood, city: a.city, state: a.state }))}
        dates={dates}
      />
    </div>
  );
}
