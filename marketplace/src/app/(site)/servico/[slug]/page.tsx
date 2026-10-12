import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, Clock, Home, Ruler, Users, X } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, Notice } from "@/components/ui/surface";
import { RatingBadge } from "@/components/reviews/stars";
import { formatBps, formatBRL } from "@/domain/money";
import { customerPrice } from "@/domain/pricing";
import { formatMinutes } from "@/lib/utils";
import { getSessionUser } from "@/server/auth";
import { getServiceDetail } from "@/server/catalog";
import { listProvidersForService } from "@/server/reviews";

const SUPPLIES = {
  CUSTOMER: "Produtos e equipamentos fornecidos pelo cliente",
  PROVIDER: "Produtos e equipamentos fornecidos pelo profissional",
  SHARED: "Produtos e equipamentos combinados entre as partes",
} as const;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const service = await getServiceDetail((await params).slug);
  return { title: service?.name ?? "Serviço", description: service?.summary ?? undefined };
}

function FromPrice({ cents, suffix }: { cents: number | null; suffix?: string }) {
  if (cents === null) return <p className="text-sm text-muted">Aguardando profissionais com preço publicado</p>;
  return (
    <p className="text-sm text-muted">
      a partir de <span className="text-2xl font-bold tracking-tight text-ink">{formatBRL(cents)}</span>
      {suffix ? <span> {suffix}</span> : null}
    </p>
  );
}

export default async function ServicePage({ params }: Props) {
  const [service, user] = await Promise.all([getServiceDetail((await params).slug), getSessionUser()]);
  if (!service) notFound();
  const providers = service.pricingModel === "QUOTE" ? [] : await listProvidersForService(service.id);

  const tiers = (Array.isArray(service.cancellationPolicy?.tiers) ? service.cancellationPolicy.tiers : []) as {
    minHoursBefore: number;
    refundBps: number;
  }[];

  return (
    <div className="container-page py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="Trilha">
        <Link href="/servicos" className="hover:text-ink">Serviços</Link>
        <ChevronRight className="size-4" aria-hidden />
        <Link href={`/servicos/${service.category.slug}`} className="hover:text-ink">{service.category.name}</Link>
        <ChevronRight className="size-4" aria-hidden />
        <span className="text-ink">{service.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-10">
          <header>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{service.name}</h1>
            {service.description ? <p className="mt-3 max-w-2xl leading-relaxed text-ink-soft">{service.description}</p> : null}
            <p className="mt-3 text-sm text-muted">
              {service.providerCount > 0
                ? `${service.providerCount} ${service.providerCount === 1 ? "profissional oferece" : "profissionais oferecem"} este serviço.`
                : "Ainda não há profissionais com preço publicado para este serviço."}
            </p>
          </header>

          {providers.length > 0 && (
            <section aria-labelledby="profissionais">
              <h2 id="profissionais" className="text-xl font-bold">Profissionais</h2>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {providers.map(({ provider: pr, minPriceCents }) => (
                  <li key={pr.id}>
                    <Link
                      href={`/profissionais/${pr.id}`}
                      className="flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-4 transition hover:border-brand/40"
                    >
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-lg font-bold text-brand-ink" aria-hidden>
                        {pr.displayName.charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{pr.displayName}</span>
                        <RatingBadge sum={pr.ratingSum} count={pr.ratingCount} />
                        <span className="block text-xs text-muted">
                          {pr.baseCity ? `${pr.baseCity}/${pr.baseState}` : ""}
                          {pr.experienceYears != null ? ` · ${pr.experienceYears} anos de experiência` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-xs text-muted">
                        a partir de
                        <span className="block text-base font-bold text-ink">
                          {formatBRL(customerPrice(minPriceCents, service.commissionRateBps, service.commissionMode))}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {service.pricingModel === "FIXED" && (
            <section aria-labelledby="pacotes" className="space-y-4">
              <h2 id="pacotes" className="text-xl font-bold">Pacotes</h2>
              {service.packages.map((p) => (
                <Card key={p.id} className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{p.name}</h3>
                      <p className="mt-1 text-sm text-muted">{p.description}</p>
                    </div>
                    <div className="shrink-0 sm:text-right">
                      <FromPrice cents={p.fromCents} />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge><Clock className="size-3.5" aria-hidden /> {formatMinutes(p.durationMinutes)} estimadas</Badge>
                    <Badge><Users className="size-3.5" aria-hidden /> {p.professionals} {p.professionals === 1 ? "profissional" : "profissionais"}</Badge>
                    {p.bedrooms ? <Badge><Home className="size-3.5" aria-hidden /> até {p.bedrooms} quartos · {p.bathrooms} {p.bathrooms === 1 ? "banheiro" : "banheiros"}</Badge> : null}
                    {p.maxAreaM2 ? <Badge><Ruler className="size-3.5" aria-hidden /> até {p.maxAreaM2} m²</Badge> : null}
                  </div>

                  <div className="mt-6 grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-sm font-semibold">Incluso</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                        {p.includedItems.map((item) => (
                          <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Não incluso</p>
                      <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
                        {p.excludedItems.map((item) => (
                          <li key={item} className="flex gap-2"><X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 space-y-1 border-t border-line pt-4 text-sm text-muted">
                    <p><span className="font-medium text-ink-soft">Materiais:</span> {p.suppliesNote ?? SUPPLIES[p.suppliesBy]}</p>
                    {p.conditions ? <p><span className="font-medium text-ink-soft">Condições:</span> {p.conditions}</p> : null}
                  </div>
                </Card>
              ))}
            </section>
          )}

          {service.pricingModel === "CALCULATED" && (
            <section aria-labelledby="calculo" className="space-y-4">
              <h2 id="calculo" className="text-xl font-bold">Como o preço é calculado</h2>
              {service.priceRules.map((r) => (
                <Card key={r.id} className="p-6">
                  <h3 className="font-semibold">{r.name}</h3>
                  <p className="mt-1 text-sm text-muted">
                    Você informa a quantidade ({r.minQuantity} a {r.maxQuantity} {r.unitLabel}) e o valor é calculado
                    com o preço por unidade de cada profissional.
                  </p>
                  <div className="mt-4">
                    <FromPrice cents={r.fromCents} suffix={`por ${r.unitLabel}`} />
                    {r.minTotalCents ? <p className="mt-1 text-xs text-muted">Valor mínimo a partir de {formatBRL(r.minTotalCents)}</p> : null}
                  </div>
                </Card>
              ))}
            </section>
          )}

          {service.pricingModel === "QUOTE" && (
            <Notice title="Serviço sob orçamento">
              O valor depende de medidas, materiais e condições do local. Você descreve o que precisa e envia fotos;
              o profissional envia uma proposta. Nada é cobrado antes de você aprovar o escopo e o preço.
            </Notice>
          )}

          {service.addons.length > 0 && (
            <section aria-labelledby="adicionais">
              <h2 id="adicionais" className="text-xl font-bold">Adicionais</h2>
              <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface">
                {service.addons.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                    <span>
                      <span className="font-medium">{a.name}</span>
                      {a.description ? <span className="block text-muted">{a.description}</span> : null}
                    </span>
                    <span className="shrink-0 text-right text-muted">
                      {a.fromCents !== null ? (
                        <>a partir de <span className="font-semibold text-ink">{formatBRL(a.fromCents)}</span>{a.pricing === "PER_UNIT" && a.unitLabel ? ` / ${a.unitLabel}` : ""}</>
                      ) : (
                        "conforme profissional"
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {service.cancellationPolicy && (
            <section aria-labelledby="cancelamento">
              <h2 id="cancelamento" className="text-xl font-bold">Cancelamento</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{service.cancellationPolicy.description}</p>
              {tiers.length > 0 ? (
                <ul className="mt-3 space-y-1 text-sm text-muted">
                  {tiers.map((t) => (
                    <li key={t.minHoursBefore}>
                      {t.minHoursBefore > 0 ? `Com ${t.minHoursBefore}h ou mais de antecedência` : "Com menos antecedência"}: reembolso de {formatBps(t.refundBps)}
                    </li>
                  ))}
                </ul>
              ) : null}
              <Link href="/cancelamento" className="mt-2 inline-block text-sm font-medium text-brand hover:underline">Ver política completa</Link>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="space-y-4 p-6">
            <p className="font-semibold">Como funciona o preço</p>
            <p className="text-sm leading-relaxed text-muted">
              Cada profissional define o próprio preço.{" "}
              {service.commissionMode === "ON_TOP"
                ? `Ao valor dele é acrescida a taxa de serviço da plataforma (${formatBps(service.commissionRateBps)}).`
                : `A taxa da plataforma (${formatBps(service.commissionRateBps)}) já está incluída no valor.`}{" "}
              Os valores exibidos acima já incluem a taxa.
            </p>
            {service.pricingModel !== "QUOTE" && providers.length > 0 ? (
              <LinkButton href={`/contratar/${service.slug}`} className="w-full">Escolher horário</LinkButton>
            ) : service.pricingModel === "QUOTE" ? (
              <p className="rounded-xl bg-canvas p-4 text-sm text-muted">A solicitação de orçamento online chega numa próxima etapa da plataforma.</p>
            ) : (
              <p className="rounded-xl bg-canvas p-4 text-sm text-muted">Ainda não há profissionais disponíveis para este serviço.</p>
            )}
            {user ? null : <p className="text-center text-xs text-muted">Você vai criar uma conta grátis ou entrar antes de confirmar.</p>}
          </Card>
        </aside>
      </div>
    </div>
  );
}
