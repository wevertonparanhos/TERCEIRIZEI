import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-brand-navy">Cadastre-se</h1>
      <p className="mb-6 text-sm text-slate-500">
        Crie sua conta para acompanhar suas demandas e processos no Portal do Cliente.
      </p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        Já tem uma conta?{" "}
        <Link href="/login" className="text-brand-blue hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
