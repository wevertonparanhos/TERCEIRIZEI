import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { PortalShell } from "@/modules/portal/portal-shell";
import { hexToRgbTriplet, softAccentTriplet } from "@/modules/portal/settings";

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

  // Configuração do portal deste cliente (cor de destaque, pode abrir demandas).
  const settings = user.clientId
    ? await prisma.clientPortalSettings.findUnique({ where: { clientId: user.clientId }, select: { accentColor: true, allowRequests: true } })
    : null;
  const navItems = settings && !settings.allowRequests ? NAV_ITEMS.filter((i) => i.href !== "/portal/nova-demanda") : NAV_ITEMS;

  return (
    <PortalShell
      accentRgb={settings ? hexToRgbTriplet(settings.accentColor) : null}
      accentSoftRgb={settings ? softAccentTriplet(settings.accentColor) : null}
      navItems={navItems}
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
