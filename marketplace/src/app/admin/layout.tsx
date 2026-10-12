import { AppShell } from "@/components/app-shell";
import type { NavItem } from "@/components/nav-links";
import { can, type Permission } from "@/domain/permissions";
import { requirePageRole } from "@/server/auth";

const NAV: (NavItem & { permission: Permission })[] = [
  { href: "/admin", label: "Painel", icon: "dashboard", exact: true, permission: "admin:dashboard:read" },
  { href: "/admin/profissionais", label: "Profissionais", icon: "verified", permission: "admin:providers:approve" },
  { href: "/admin/categorias", label: "Categorias", icon: "tags", permission: "admin:catalog:manage" },
  { href: "/admin/servicos", label: "Serviços e pacotes", icon: "briefcase", permission: "admin:catalog:manage" },
  { href: "/admin/financeiro", label: "Financeiro", icon: "wallet", permission: "admin:finance:read" },
  { href: "/admin/comissoes", label: "Comissões", icon: "percent", permission: "admin:commission:manage" },
  { href: "/admin/avaliacoes", label: "Avaliações", icon: "star", permission: "admin:reviews:moderate" },
  { href: "/admin/usuarios", label: "Usuários", icon: "users", permission: "support:users:read" },
  { href: "/admin/auditoria", label: "Auditoria", icon: "audit", permission: "admin:audit:read" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageRole(["ADMIN", "SUPPORT"], "/admin");
  const nav = NAV.filter((item) => can(user.role, item.permission)).map((item) => ({ href: item.href, label: item.label, icon: item.icon, exact: item.exact }));
  return (
    <AppShell user={user} nav={nav}>
      {children}
    </AppShell>
  );
}
