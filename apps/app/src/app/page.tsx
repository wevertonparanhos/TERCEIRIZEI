import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

export default async function RootPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">
            Sua conta está autenticada, mas ainda não tem um perfil em <code>public.users</code>. Verifique se o
            trigger de provisionamento (<code>packages/db/sql</code>) foi aplicado no projeto Supabase.
          </p>
        </div>
      </main>
    );
  }

  if (user.role !== "CLIENTE") {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-slate-500">Bem-vindo(a),</p>
        <h1 className="mt-1 text-2xl font-bold text-brand-navy">{user.name}</h1>
        <p className="mt-6 rounded-md bg-slate-50 px-4 py-3 text-xs text-slate-400">
          O Portal do Cliente completo chega na Etapa 7. Por enquanto, sua conta já está ativa e conectada aos seus
          dados.
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
