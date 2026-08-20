import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ClientForm } from "@/modules/clients/client-form";
import { createClient } from "@/modules/clients/actions";

export default async function NovoClientePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN" && user.role !== "GESTOR") redirect("/clientes");

  const owners = await prisma.user.findMany({
    where: { tenantId: user.tenantId, role: { name: { not: "CLIENTE" } }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href="/clientes" className="text-sm text-accent hover:underline">
        ← Voltar para Clientes
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">Novo Cliente</h1>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <ClientForm owners={owners} submitLabel="Criar cliente" onSubmit={createClient} />
      </div>
    </div>
  );
}
