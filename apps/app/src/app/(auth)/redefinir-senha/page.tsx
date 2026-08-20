import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-ink">Redefinir senha</h1>
      <p className="mb-6 text-sm text-muted">Escolha uma nova senha para sua conta.</p>
      <ResetPasswordForm />
    </div>
  );
}
