import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { ServiceTypeForm } from "@/modules/service-types/service-type-form";
import { createServiceType } from "@/modules/service-types/actions";

export default async function NovoServicoPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/servicos");

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/servicos" className="text-sm text-accent hover:underline">
        ← Voltar para Modelos de Processo
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">Novo Modelo</h1>
      <p className="mt-1 text-sm text-muted">
        Depois de criado, você pode adicionar o checklist padrão na tela do modelo.
      </p>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <ServiceTypeForm submitLabel="Criar modelo" onSubmit={createServiceType} />
      </div>
    </div>
  );
}
