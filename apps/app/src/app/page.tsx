import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
  CLIENTE: "Cliente",
};

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">
            Sua conta está autenticada, mas ainda não tem um perfil em <code>public.users</code>. Verifique se o
            trigger de provisionamento (<code>packages/db/sql/001_rls_and_provisioning.sql</code>) foi aplicado no
            projeto Supabase.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">Bem-vindo(a) de volta,</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-navy">{user.name}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {ROLE_LABELS[user.role]} · {user.email}
        </p>
        <p className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-400">
          Autenticação e RBAC (Etapa 2) concluídos. O dashboard e os demais módulos chegam nas próximas etapas.
        </p>
        <form action="/logout" method="post" className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Sair
          </Button>
        </form>
      </div>
    </main>
  );
}
