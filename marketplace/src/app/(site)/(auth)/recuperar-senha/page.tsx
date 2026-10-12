import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Recuperar senha</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted">
        Lembrou? <Link href="/entrar" className="font-semibold text-brand hover:underline">Voltar para o login</Link>
      </p>
    </>
  );
}
