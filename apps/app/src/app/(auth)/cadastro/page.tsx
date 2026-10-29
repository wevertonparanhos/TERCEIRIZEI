import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-ink">Cadastre-se</h1>
      <p className="mb-6 text-sm text-muted">
        Crie sua conta para acompanhar suas tarefas no Portal do Cliente.
      </p>
      <p className="mb-4 rounded-md bg-surface-alt px-3 py-2 text-xs text-muted">
        Faz parte da equipe da Terceirizei? Não use este cadastro: abra o link do convite que você recebeu ou, na tela de entrada, use{" "}
        <Link href="/esqueci-senha" className="text-accent hover:underline">
          Esqueci minha senha
        </Link>{" "}
        para criar a sua senha.
      </p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
