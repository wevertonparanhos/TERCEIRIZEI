import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-brand-navy">Entrar</h1>
      <p className="mb-6 text-sm text-slate-500">Acesse com seu e-mail e senha cadastrados.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-500">
        <Link href="/esqueci-senha" className="text-brand-blue hover:underline">
          Esqueci minha senha
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-slate-500">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="text-brand-blue hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
