import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";

const NAV_LINKS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/processos", label: "Meus Processos" },
  { href: "/portal/empresas", label: "Minhas Empresas" },
  { href: "/portal/perfil", label: "Meu Perfil" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Área do cliente é só pra CLIENT — staff usa a área interna normal.
  if (user.role !== "CLIENT") redirect("/");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="text-lg font-extrabold tracking-tight text-ink">LEGALIZA.AI</span>
          <nav className="flex items-center gap-4 text-sm">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">
            {user.name} <span className="text-muted-soft">·</span> <span className="font-medium text-accent">Portal do Cliente</span>
          </span>
          <form action="/logout" method="post">
            <button type="submit" className="text-muted hover:text-ink hover:underline">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
