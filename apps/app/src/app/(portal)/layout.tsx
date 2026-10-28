import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PortalShell } from "@/modules/portal/portal-shell";

const NAV_ITEMS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/processos", label: "Minhas Tarefas" },
  { href: "/portal/nova-demanda", label: "Nova Demanda" },
  { href: "/portal/chat", label: "Chat" },
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
    <PortalShell
      navItems={NAV_ITEMS}
      userName={user.name}
      themeToggle={<ThemeToggle />}
      logout={
        <form action="/logout" method="post">
          <Button type="submit" variant="outline" size="sm" className="w-full">
            Sair
          </Button>
        </form>
      }
    >
      {children}
    </PortalShell>
  );
}
