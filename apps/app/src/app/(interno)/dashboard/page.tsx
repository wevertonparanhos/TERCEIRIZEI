import { getCurrentUser } from "@/lib/rbac";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div className="p-8">
      <p className="text-sm text-slate-500">Bom dia,</p>
      <h1 className="mt-1 text-2xl font-bold text-brand-navy">{user?.name}</h1>
      <p className="mt-1 text-sm text-slate-500">{user ? ROLE_LABELS[user.role] : ""}</p>
      <p className="mt-6 max-w-md rounded-md border border-slate-200 bg-white px-4 py-3 text-xs text-slate-400">
        Indicadores gerenciais (processos, faturamento, prazos) chegam na Etapa 9. Comece pelo módulo de{" "}
        <a href="/clientes" className="text-brand-blue hover:underline">
          Clientes
        </a>
        .
      </p>
    </div>
  );
}
