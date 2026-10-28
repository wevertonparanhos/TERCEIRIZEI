import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@terceirizei/db";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Repeat,
  FileSignature,
  Users,
  Handshake,
  ExternalLink,
  MessageSquare,
  DollarSign,
  Activity,
  UserCircle,
  FileClock,
  LogOut,
  Building2,
  Bell,
  Settings,
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
      { href: "/equipe", label: "Equipe", roles: ["ADMIN", "GESTOR"], icon: Users },
      { href: "/clientes", label: "Clientes", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: Handshake },
      { href: "/clientes/portal", label: "Portal de Clientes", roles: ["ADMIN", "GESTOR"], icon: ExternalLink },
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

  const unreadMentions = await prisma.processCommentMention.count({
    where: { mentionedUserId: user.id, readAt: null, comment: { process: { tenantId: user.tenantId } } },
  });

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="sticky top-0 flex h-screen w-60 flex-none flex-col border-r border-border bg-surface">
        <div className="flex h-14 items-center gap-2.5 px-4">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-accent text-white shadow-sm">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="text-base font-extrabold tracking-tight text-ink">
            Terceirizei<span className="text-accent">OS</span>
          </span>
        </div>
        <SidebarNav groups={navGroups} />
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-surface-alt/50 px-2 py-2">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-[11px] text-muted">{ROLE_LABELS[user.role]}</p>
            </div>
            <form action="/logout" method="post">
              <button
                type="submit"
                title="Sair"
                aria-label="Sair"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 flex-none items-center justify-end gap-1 border-b border-border bg-bg/80 px-6 backdrop-blur">
          <ThemeToggle className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink" />
          <Link
            href="/atividades"
            title="Notificações"
            aria-label={`Notificações (${unreadMentions} não lidas)`}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <Bell className="h-[18px] w-[18px]" />
            {unreadMentions > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadMentions > 9 ? "9+" : unreadMentions}
              </span>
            )}
          </Link>
          <Link
            href="/perfil"
            title="Configurações"
            aria-label="Configurações"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <Settings className="h-[18px] w-[18px]" />
          </Link>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
