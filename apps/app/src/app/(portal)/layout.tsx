import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/portal", label: "Dashboard" },
  { href: "/portal/demandas", label: "Minhas Demandas" },
  { href: "/portal/processos", label: "Meus Processos" },
  { href: "/portal/nova-demanda", label: "Nova Demanda" },
  { href: "/portal/documentos", label: "Documentos" },
  { href: "/portal/faturas", label: "Faturas" },
  { href: "/portal/perfil", label: "Meu Perfil" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.role !== "CLIENTE") redirect("/dashboard");

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 flex-none flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <span className="font-sans text-base font-extrabold tracking-tight text-brand-navy">
            Terceirizei OS
          </span>
          <p className="text-xs text-slate-400">Portal do Cliente</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-brand-navy"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-4 py-4">
          <p className="truncate text-sm font-medium text-brand-navy">{user.name}</p>
          <p className="text-xs text-slate-500">Cliente</p>
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
