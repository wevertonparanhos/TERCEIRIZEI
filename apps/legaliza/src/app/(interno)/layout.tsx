import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  TENANT_ADMIN: "Admin do Tenant",
  OPERATOR: "Operador",
  CLIENT: "Cliente",
};

// Clientes/Empresas são páginas escopadas a tenant — sem sentido pro SUPER_ADMIN
// (admin de plataforma, sem tenant fixo), então o link nem aparece pra ele.
const NAV_LINKS = [
  { href: "/", label: "Dashboard", roles: ["SUPER_ADMIN", "TENANT_ADMIN", "OPERATOR", "CLIENT"] },
  { href: "/clientes", label: "Clientes", roles: ["TENANT_ADMIN", "OPERATOR"] },
  { href: "/empresas", label: "Empresas", roles: ["TENANT_ADMIN", "OPERATOR"] },
];

export default async function InternoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const links = NAV_LINKS.filter((link) => link.roles.includes(user.role));

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div className="flex items-center gap-8">
          <span className="text-lg font-extrabold tracking-tight text-ink">LEGALIZA.AI</span>
          <nav className="flex items-center gap-4 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted hover:text-ink">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">
            {user.name} <span className="text-muted-soft">·</span>{" "}
            <span className="font-medium text-accent">{ROLE_LABELS[user.role] ?? user.role}</span>
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
