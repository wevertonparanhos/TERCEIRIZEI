import { BadgeCheck, CalendarCheck, CreditCard, Lock, Receipt, Search, ShieldCheck } from "lucide-react";
import { CategoryCard } from "@/components/category-card";
import { SearchBar } from "@/components/search-bar";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { brand } from "@/lib/brand";
import { listCategories } from "@/server/catalog";

const STEPS = [
  { icon: Search, title: "Escolha o serviço", text: "Veja o escopo de cada pacote, o que está incluso e o que não está." },
  { icon: Receipt, title: "Compare preços", text: "Cada profissional define seu preço. Você vê o valor final antes de pagar." },
  { icon: CalendarCheck, title: "Agende", text: "Escolha data e horário disponíveis na agenda do profissional." },
  { icon: CreditCard, title: "Pague com segurança", text: "Pagamento antecipado pela plataforma. O contato é liberado após a confirmação." },
];

const TRUST = [
  { icon: BadgeCheck, title: "Profissionais verificados", text: "Cadastro analisado pela equipe antes de aparecer nas buscas." },
  { icon: Receipt, title: "Preço transparente", text: "Valor do profissional e taxa de serviço exibidos separadamente." },
  { icon: Lock, title: "Dados protegidos", text: "Telefone e endereço só são compartilhados entre as partes de um pedido pago." },
];

export default async function HomePage() {
  const categories = await listCategories();

  return (
    <>
      <section className="container-page grid gap-10 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
            <ShieldCheck className="size-3.5" aria-hidden /> Cadastro e pesquisa gratuitos
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Sua casa em ordem, <span className="text-brand">sem surpresa no preço.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            Limpeza, reparos, pintura e muito mais com profissionais avaliados. Você vê exatamente o que está
            contratando e quanto vai pagar antes de confirmar.
          </p>
          <div className="mt-8">
            <SearchBar />
          </div>
          <p className="mt-4 text-sm text-muted">
            É profissional?{" "}
            <LinkButton href="/cadastro?perfil=profissional" variant="link">Ofereça seus serviços</LinkButton>
          </p>
        </div>

        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-brand-soft" aria-hidden />
          <p className="relative text-sm font-semibold text-muted">Exemplo de composição de preço</p>
          <p className="relative mt-1 text-xl font-bold text-ink">Limpeza básica · até 2 quartos</p>
          <dl className="relative mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Valor do profissional</dt>
              <dd className="font-medium">R$ 200,00</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Taxa de serviço da plataforma (20%)</dt>
              <dd className="font-medium">R$ 40,00</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 text-base">
              <dt className="font-semibold">Você paga</dt>
              <dd className="font-bold text-brand">R$ 240,00</dd>
            </div>
          </dl>
          <p className="relative mt-5 text-xs text-muted">
            Valores ilustrativos. O preço real é definido por cada profissional e aparece antes do pagamento.
          </p>
        </Card>
      </section>

      <section className="container-page" aria-labelledby="categorias">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 id="categorias" className="text-2xl font-bold tracking-tight sm:text-3xl">O que você precisa?</h2>
            <p className="mt-1 text-muted">Comece pela limpeza e encontre também reparos, pintura e instalações.</p>
          </div>
          <LinkButton href="/servicos" variant="link" className="hidden sm:inline-flex">Ver todos</LinkButton>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <CategoryCard key={c.id} {...c} />
          ))}
        </div>
      </section>

      <section className="container-page mt-20" aria-labelledby="como">
        <h2 id="como" className="text-2xl font-bold tracking-tight sm:text-3xl">Como funciona</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-[var(--radius-card)] bg-surface p-5 ring-1 ring-line">
              <span className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-ink text-sm font-bold text-white">{i + 1}</span>
                <s.icon className="size-5 text-brand" aria-hidden />
              </span>
              <p className="mt-4 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page mt-20">
        <div className="grid gap-8 rounded-[2rem] bg-ink p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Confiança em cada etapa</h2>
            <p className="mt-3 text-white/70">
              O {brand.name} acompanha o pedido do agendamento à avaliação, com regras claras de cancelamento e reembolso.
            </p>
            <LinkButton href="/seguranca" variant="secondary" className="mt-6">Saiba mais</LinkButton>
          </div>
          <ul className="space-y-5">
            {TRUST.map((t) => (
              <li key={t.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10">
                  <t.icon className="size-5 text-highlight" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold">{t.title}</span>
                  <span className="text-sm text-white/70">{t.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="container-page mt-20">
        <div className="flex flex-col items-start gap-6 rounded-[2rem] border border-line bg-surface p-8 sm:flex-row sm:items-center sm:justify-between sm:p-12">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">É profissional autônomo?</h2>
            <p className="mt-2 max-w-xl text-muted">
              Cadastro gratuito. Você define o seu preço, sua agenda e as regiões que atende. A taxa da plataforma é
              acrescida ao valor pago pelo cliente.
            </p>
          </div>
          <LinkButton href="/cadastro?perfil=profissional" size="lg">Cadastrar como profissional</LinkButton>
        </div>
      </section>
    </>
  );
}
