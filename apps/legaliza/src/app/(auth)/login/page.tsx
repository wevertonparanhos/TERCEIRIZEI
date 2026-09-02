import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-ink">Entrar</h1>
      <p className="mb-6 text-sm text-muted">Acesse com seu e-mail e senha cadastrados.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
