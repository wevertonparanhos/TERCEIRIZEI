import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";

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

  redirect(user.role === "CLIENTE" ? "/portal" : "/dashboard");
}
