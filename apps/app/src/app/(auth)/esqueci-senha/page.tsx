import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-brand-navy">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-slate-500">
        Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
      </p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/login" className="text-brand-blue hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
