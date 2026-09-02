import { requireRole } from "@/lib/rbac";
import { ClientForm } from "@/modules/clients/client-form";
import { createClient } from "@/modules/clients/actions";

export default async function NewClientPage() {
  await requireRole("TENANT_ADMIN", "OPERATOR");

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-ink">Novo Cliente</h1>
      <div className="rounded-lg border border-border bg-surface p-6">
        <ClientForm onSubmit={createClient} submitLabel="Criar Cliente" />
      </div>
    </div>
  );
}
