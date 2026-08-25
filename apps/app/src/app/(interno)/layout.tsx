import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"] },
  { href: "/clientes", label: "Clientes", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"] },
  { href: "/clientes/portal", label: "Portal de Clientes", roles: ["ADMIN", "GESTOR"] },
  { href: "/processos", label: "Processos", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"] },
  { href: "/servicos", label: "Modelos de Processo", roles: ["ADMIN", "GESTOR"] },
  { href: "/financeiro", label: "Financeiro", roles: ["ADMIN", "GESTOR", "FINANCEIRO"] },
  { href: "/auditoria", label: "Auditoria", roles: ["ADMIN"] },
  { href: "/equipe", label: "Equipe", roles: ["ADMIN"] },
  { href: "/perfil", label: "Meu Perfil", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"] },
];

export default async function InternoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role === "CLIENTE") redirect("/");

  const navItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-60 flex-none flex-col border-r border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <span className="font-sans text-base font-extrabold tracking-tight text-ink">Terceirizei OS</span>
          <ThemeToggle />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-alt hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border px-4 py-4">
          <p className="truncate text-sm font-medium text-ink">{user.name}</p>
          <p className="text-xs text-muted">{ROLE_LABELS[user.role]}</p>
          <form action="/logout" method="post" className="mt-3">
            <Button type="submit" variant="outline" size="sm" className="w-full">
              Sair
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
