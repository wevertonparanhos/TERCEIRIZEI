import { getCurrentUser } from "@/lib/rbac";
import { AccountForm } from "@/modules/account/account-form";
import { updateProfile } from "@/modules/account/actions";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <AccountForm
      name={user.name}
      email={user.email}
      roleLabel={ROLE_LABELS[user.role] ?? user.role}
      updateProfile={updateProfile}
    />
  );
}
