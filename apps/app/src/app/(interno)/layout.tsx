import { redirect } from "next/navigation";
import Link from "next/link";
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
  type LucideIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

type NavItem = { href: string; label: string; roles: string[]; icon: LucideIcon };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operações",
    items: [
      { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: LayoutDashboard },
      { href: "/calendario", label: "Calendário", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: Calendar },
      { href: "/processos", label: "Processos", roles: ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"], icon: ClipboardList },
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

  const navGroups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.roles.includes(user.role)),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex min-h-screen bg-bg">
      <aside className="flex w-60 flex-none flex-col border-r border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-5">
          <span className="font-sans text-base font-extrabold tracking-tight text-ink">Terceirizei OS</span>
          <ThemeToggle />
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-soft">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-alt hover:text-ink"
                    >
                      <Icon className="h-4 w-4 flex-none" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
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
