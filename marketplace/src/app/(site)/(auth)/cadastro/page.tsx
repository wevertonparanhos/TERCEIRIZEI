import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HOME_BY_ROLE } from "@/domain/permissions";
import { safeRedirectPath } from "@/lib/utils";
import { getSessionUser } from "@/server/auth";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ perfil?: string; redirect?: string }> }) {
  const { perfil, redirect: to } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(HOME_BY_ROLE[user.role]);

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Cadastro gratuito para clientes e profissionais.</p>
      <SignUpForm defaultRole={perfil === "profissional" ? "PROVIDER" : "CUSTOMER"} redirectTo={safeRedirectPath(to, "")} />
      <p className="mt-6 text-center text-sm text-muted">
        Já tem conta? <Link href="/entrar" className="font-semibold text-brand hover:underline">Entrar</Link>
      </p>
    </>
  );
}
