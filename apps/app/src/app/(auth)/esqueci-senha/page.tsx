import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage({ searchParams }: { searchParams: { link?: string } }) {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-ink">Esqueci minha senha</h1>
      <p className="mb-6 text-sm text-muted">
        Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
      </p>
      {searchParams.link === "invalido" && (
        <p role="alert" className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          Esse link venceu ou já foi usado. Peça um novo abaixo.
        </p>
      )}
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="text-accent hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
