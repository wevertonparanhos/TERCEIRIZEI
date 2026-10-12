import { AppShell } from "@/components/app-shell";
import { requirePageRole } from "@/server/auth";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["CUSTOMER"], "/conta");
  return (
    <AppShell
      user={user}
      nav={[
        { href: "/conta", label: "Início", icon: "dashboard", exact: true },
        { href: "/servicos", label: "Contratar serviço", icon: "home" },
        { href: "/conta/perfil", label: "Meus dados", icon: "user" },
      ]}
    >
      {children}
    </AppShell>
  );
}
