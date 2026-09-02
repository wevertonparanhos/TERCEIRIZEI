import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV_ITEMS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/processos", label: "Meus Processos" },
  { href: "/portal/nova-demanda", label: "Nova Demanda" },
  { href: "/portal/propostas", label: "Propostas" },
  { href: "/portal/documentos", label: "Documentos" },
  { href: "/portal/faturas", label: "Faturas" },
  { href: "/portal/perfil", label: "Meu Perfil" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "CLIENTE") redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-60 flex-none flex-col border-r border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <div>
            <span className="font-sans text-base font-extrabold tracking-tight text-ink">Terceirizei OS</span>
            <p className="text-xs text-muted-soft">Portal do Cliente</p>
          </div>
          <ThemeToggle />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
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
          <p className="text-xs text-muted">Cliente</p>
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
