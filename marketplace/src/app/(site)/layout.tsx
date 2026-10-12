import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { LinkButton } from "@/components/ui/button";
import { HOME_BY_ROLE } from "@/domain/permissions";
import { brand } from "@/lib/brand";
import { getSessionUser } from "@/server/auth";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <BrandMark />
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-soft md:flex" aria-label="Principal">
            <Link href="/servicos" className="hover:text-ink">Serviços</Link>
            <Link href="/como-funciona" className="hover:text-ink">Como funciona</Link>
            <Link href="/seguranca" className="hover:text-ink">Segurança</Link>
            <Link href="/cadastro?perfil=profissional" className="hover:text-ink">Seja profissional</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <LinkButton href={HOME_BY_ROLE[user.role]} size="sm">Minha área</LinkButton>
            ) : (
              <>
                <LinkButton href="/entrar" variant="ghost" size="sm">Entrar</LinkButton>
                <LinkButton href="/cadastro" size="sm">Criar conta</LinkButton>
              </>
            )}
          </div>
        </div>
        <nav className="container-page flex gap-5 overflow-x-auto pb-3 text-sm font-medium text-ink-soft [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden" aria-label="Principal (celular)">
          <Link href="/servicos" className="shrink-0">Serviços</Link>
          <Link href="/como-funciona" className="shrink-0">Como funciona</Link>
          <Link href="/seguranca" className="shrink-0">Segurança</Link>
          <Link href="/cadastro?perfil=profissional" className="shrink-0">Seja profissional</Link>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-line bg-surface">
        <div className="container-page grid gap-8 py-10 text-sm sm:grid-cols-3">
          <div className="space-y-3">
            <BrandMark />
            <p className="max-w-xs text-muted">{brand.tagline}</p>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-ink">Plataforma</p>
            <ul className="space-y-1.5 text-muted">
              <li><Link href="/servicos" className="hover:text-ink">Serviços</Link></li>
              <li><Link href="/como-funciona" className="hover:text-ink">Como funciona</Link></li>
              <li><Link href="/seguranca" className="hover:text-ink">Segurança e confiança</Link></li>
              <li><Link href="/cadastro?perfil=profissional" className="hover:text-ink">Cadastre-se como profissional</Link></li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-ink">Políticas</p>
            <ul className="space-y-1.5 text-muted">
              <li><Link href="/cancelamento" className="hover:text-ink">Política de cancelamento</Link></li>
              <li><Link href="/termos" className="hover:text-ink">Termos de uso</Link></li>
              <li><Link href="/privacidade" className="hover:text-ink">Política de privacidade</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-4">
          <p className="container-page text-xs text-muted">
            © {new Date().getFullYear()} {brand.name} · Nome e identidade visual provisórios.
          </p>
        </div>
      </footer>
    </div>
  );
}
