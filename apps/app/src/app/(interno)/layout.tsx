import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  LayoutTemplate,
  Repeat,
  FileSignature,
  Users,
  Handshake,
  ExternalLink,
  MessageSquare,
  DollarSign,
  Activity,
  ShieldCheck,
  UserCircle,
  FileClock,
  LogOut,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav, type NavGroup } from "@/components/sidebar-nav";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

type NavItem = { href: string; label: string; roles: string[]; icon: LucideIcon };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operações",
    items: [
      { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: LayoutDashboard },
      { href: "/calendario", label: "Calendário", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: Calendar },
      { href: "/processos", label: "Área de Trabalho", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: ClipboardList },
      { href: "/tarefas-recorrentes", label: "Tarefas Recorrentes", roles: ["ADMIN", "GESTOR", "OPERACIONAL"], icon: Repeat },
      { href: "/propostas", label: "Propostas", roles: ["ADMIN", "GESTOR", "FINANCEIRO"], icon: FileSignature },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/equipe", label: "Equipe", roles: ["ADMIN"], icon: Users },
      { href: "/clientes", label: "Clientes", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: Handshake },
      { href: "/clientes/portal", label: "Portal de Clientes", roles: ["ADMIN", "GESTOR"], icon: ExternalLink },
      { href: "/servicos", label: "Modelos de Processo", roles: ["ADMIN", "GESTOR"], icon: LayoutTemplate },
      {
        href: "/licencas",
        label: "Licenças e Certidões",
        roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"],
        icon: FileClock,
      },
    ],
  },
  {
    label: "Comunicação",
    items: [{ href: "/chat", label: "Chat", roles: ["ADMIN", "GESTOR", "OPERACIONAL"], icon: MessageSquare }],
  },
  {
    label: "Relatórios",
    items: [
      { href: "/financeiro", label: "Financeiro", roles: ["ADMIN", "GESTOR", "FINANCEIRO"], icon: DollarSign },
      { href: "/atividades", label: "Atividades", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: Activity },
      { href: "/auditoria", label: "Auditoria", roles: ["ADMIN"], icon: ShieldCheck },
    ],
  },
  {
    label: "Conta",
    items: [{ href: "/perfil", label: "Meu Perfil", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: UserCircle }],
  },
];

export default async function InternoLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role === "CLIENTE") redirect("/");

  const navGroups: NavGroup[] = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => item.roles.includes(user.role))
      .map((item) => ({ href: item.href, label: item.label, icon: <item.icon className="h-4 w-4" /> })),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 flex h-screen w-64 flex-none flex-col bg-brand-navy">
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/10 text-brand-cyan">
              <Building2 className="h-4.5 w-4.5" />
            </span>
            <span className="font-sans text-[15px] font-extrabold leading-tight tracking-tight text-white">
              Terceirizei OS
            </span>
          </div>
          <ThemeToggle className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white" />
        </div>
        <SidebarNav groups={navGroups} />
        <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-4">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-cyan/20 text-sm font-bold text-brand-cyan">
            {initials(user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-white/50">{ROLE_LABELS[user.role]}</p>
          </div>
          <form action="/logout" method="post">
            <button
              type="submit"
              title="Sair"
              aria-label="Sair"
              className="flex h-8 w-8 flex-none items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
