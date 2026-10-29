import { getCurrentUser } from "@/lib/rbac";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser().catch(() => null);
  const isClient = user?.role === "CLIENTE";
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-ink">{isClient ? "Portal do Cliente" : "Redefinir senha"}</h1>
      <p className="mb-6 text-sm text-muted">{isClient ? "Crie a senha de acesso ao seu portal. Depois é só entrar com o seu e-mail e essa senha." : "Escolha uma nova senha para sua conta."}</p>
      <ResetPasswordForm />
    </div>
  );
}
