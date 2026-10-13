import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, MapPin } from "lucide-react";
import { RatingBadge } from "@/components/reviews/stars";
import { buttonClass, LinkButton } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { Badge, Card, EmptyState } from "@/components/ui/surface";
import { addDays, utcToLocalDate } from "@/domain/availability";
import { formatBRL } from "@/domain/money";
import { db } from "@/server/db";
import { searchProviders, SORTS } from "@/server/search";

export const metadata: Metadata = { title: "Buscar profissionais" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const [{ filters: f, results }, categories, cities] = await Promise.all([
    searchProviders(raw),
    db.serviceCategory.findMany({ where: { active: true, parentId: null }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.city.findMany({ where: { active: true }, orderBy: [{ state: "asc" }, { name: "asc" }], select: { slug: true, name: true, state: true } }),
  ]);
  const today = utcToLocalDate(new Date());
  const cityName = cities.find((c) => c.slug === f.cidade);
  const categoryName = categories.find((c) => c.slug === f.categoria)?.name;
  // No celular os filtros ficam recolhidos; abertos quando já há filtro além de serviço/cidade.
  const hasFilters = !!(f.data || f.preco_max || f.nota_min || f.modalidade || f.ordenar);

  const filtersForm = (
        <form method="get" action="/buscar" className="space-y-4" aria-label="Filtros">
          <label className="block text-sm font-medium">
            Serviço
            <Select name="categoria" defaultValue={f.categoria ?? ""} className="mt-1">
              <option value="">Todos</option>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Cidade
            <Select name="cidade" defaultValue={f.cidade ?? ""} className="mt-1">
              <option value="">Todas</option>
              {cities.map((c) => <option key={c.slug} value={c.slug}>{c.name}/{c.state}</option>)}
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Data com horário livre
            <Input type="date" name="data" min={today} max={addDays(today, 60)} defaultValue={f.data ?? ""} className="mt-1" />
          </label>
          <label className="block text-sm font-medium">
            Preço até (R$)
            <Input name="preco_max" inputMode="decimal" placeholder="Sem limite" defaultValue={f.preco_max ?? ""} className="mt-1" />
          </label>
          <label className="block text-sm font-medium">
            Avaliação mínima
            <Select name="nota_min" defaultValue={f.nota_min?.toString() ?? ""} className="mt-1">
              <option value="">Qualquer</option>
              <option value="4">4 estrelas ou mais</option>
              <option value="5">Só 5 estrelas</option>
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Tipo de preço
            <Select name="modalidade" defaultValue={f.modalidade ?? ""} className="mt-1">
              <option value="">Todos</option>
              <option value="FIXED">Pacote com preço fixo</option>
              <option value="CALCULATED">Calculado (m², hora)</option>
            </Select>
          </label>
          <label className="block text-sm font-medium">
            Ordenar por
            <Select name="ordenar" defaultValue={f.ordenar ?? "relevancia"} className="mt-1">
              {Object.entries(SORTS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </Select>
          </label>
          <div className="flex gap-2">
            <button type="submit" className={buttonClass("primary", "md", "flex-1")}>Aplicar</button>
            <Link href="/buscar" className={buttonClass("ghost", "md")}>Limpar</Link>
          </div>
        </form>
  );

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-bold tracking-tight">
        {categoryName ?? "Profissionais"}
        {cityName ? <span className="text-muted"> em {cityName.name}</span> : null}
      </h1>
      <p className="mt-1 text-muted">Pesquisa gratuita. Preços já incluem a taxa de serviço.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* Celular: resultados primeiro e filtros recolhidos. Computador: filtros fixos na lateral. */}
        <details className="order-2 rounded-[var(--radius-card)] border border-line bg-surface p-4 lg:hidden [&[open]>summary]:mb-4" open={hasFilters}>
          <summary className="cursor-pointer list-none font-semibold">Filtrar e ordenar</summary>
          {filtersForm}
        </details>
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">{filtersForm}</aside>

        <div className="order-1 lg:order-none">
          <p className="mb-3 text-sm text-muted">{results.length} {results.length === 1 ? "profissional encontrado" : "profissionais encontrados"} · todos verificados</p>
          {results.length === 0 ? (
            <EmptyState
              title="Nenhum profissional com esses filtros"
              description="Tente outra data, outra cidade ou aumente o preço máximo."
              action={<LinkButton href="/buscar" variant="secondary">Limpar filtros</LinkButton>}
            />
          ) : (
            <ul className="space-y-3">
              {results.map((r) => (
                <li key={r.provider.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-start gap-4">
                      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand text-xl font-bold text-white" aria-hidden>{r.provider.displayName.charAt(0)}</span>
                      <div className="min-w-0 flex-1">
                        <Link href={`/profissionais/${r.provider.id}`} className="text-lg font-semibold hover:text-brand">{r.provider.displayName}</Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                          <RatingBadge sum={r.provider.ratingSum} count={r.provider.ratingCount} />
                          {r.provider.baseCity ? <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{r.provider.baseCity}/{r.provider.baseState}</span> : null}
                          {r.provider.experienceYears != null ? <span>{r.provider.experienceYears} anos de experiência</span> : null}
                          {r.provider.isDemo ? <Badge tone="highlight">Demonstração</Badge> : null}
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-xs text-success">
                          <CalendarCheck className="size-3.5" aria-hidden />
                          {r.freeSlots > 0 ? `${r.freeSlots} horários livres ${f.data ? "no dia escolhido" : "nos próximos 7 dias"}` : "Sem horários livres nos próximos dias"}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted">
                        a partir de
                        <span className="block text-xl font-bold text-ink">{formatBRL(r.fromCents)}</span>
                      </div>
                    </div>
                    <ul className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                      {r.services.map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={`/contratar/${s.slug}?profissional=${r.provider.id}`}
                            className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3.5 py-1.5 text-sm font-medium transition hover:border-brand hover:text-brand"
                          >
                            {s.name} <span className="text-muted">{formatBRL(s.fromCents)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
