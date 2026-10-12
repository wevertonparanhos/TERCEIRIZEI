import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/server/supabase";
import { ResetPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Nova senha" };

export default async function ResetPasswordPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Só chega aqui com sessão criada pelo link de recuperação (/auth/callback).
  if (!user) redirect("/recuperar-senha");

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Criar nova senha</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Escolha uma senha que você não usa em outros sites.</p>
      <ResetPasswordForm />
    </>
  );
}
