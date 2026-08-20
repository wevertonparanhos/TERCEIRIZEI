import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-ink">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-muted">
        Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
