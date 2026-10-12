import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HOME_BY_ROLE } from "@/domain/permissions";
import { safeRedirectPath } from "@/lib/utils";
import { getSessionUser } from "@/server/auth";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirect?: string; erro?: string }> }) {
  const { redirect: to, erro } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(safeRedirectPath(to, HOME_BY_ROLE[user.role]));

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Entrar</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Acesse sua conta para acompanhar pedidos e agendamentos.</p>
      {erro ? (
        <p className="mb-4 rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">
          O link expirou ou é inválido. Tente novamente.
        </p>
      ) : null}
      <SignInForm redirectTo={safeRedirectPath(to, "")} />
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não tem conta? <Link href="/cadastro" className="font-semibold text-brand hover:underline">Criar conta grátis</Link>
      </p>
    </>
  );
}
