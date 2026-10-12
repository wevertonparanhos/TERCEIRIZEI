import { AppShell } from "@/components/app-shell";
import { requirePageRole } from "@/server/auth";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["PROVIDER"], "/profissional");
  return (
    <AppShell
      user={user}
      nav={[
        { href: "/profissional", label: "Início", icon: "dashboard", exact: true },
        { href: "/profissional/perfil", label: "Perfil profissional", icon: "user" },
        { href: "/profissional/servicos", label: "Serviços e preços", icon: "tags" },
        { href: "/profissional/avaliacoes", label: "Avaliações", icon: "star" },
      ]}
    >
      {children}
    </AppShell>
  );
}
