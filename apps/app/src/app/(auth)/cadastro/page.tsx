import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-ink">Cadastre-se</h1>
      <p className="mb-6 text-sm text-muted">
        Crie sua conta para acompanhar suas demandas e processos no Portal do Cliente.
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
