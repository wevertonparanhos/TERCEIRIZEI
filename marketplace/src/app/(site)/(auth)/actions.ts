"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/components/ui/form";
import { echoValues } from "@/lib/form-state";
import { HOME_BY_ROLE } from "@/domain/permissions";
import { env } from "@/lib/env";
import { safeRedirectPath } from "@/lib/utils";
import { emailSchema, fieldErrors, newPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { supabaseServer } from "@/server/supabase";

export async function signUpAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "Revise os campos destacados.", values: echoValues(formData) };
  const { name, email, phone, password, role, marketing } = parsed.data;

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // O gatilho do banco só aceita CUSTOMER ou PROVIDER vindos daqui.
      data: { name, phone, role },
      emailRedirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") return { message: "Já existe uma conta com este e-mail. Tente entrar.", values: echoValues(formData) };
    if (error.code === "over_email_send_rate_limit") return { message: "Muitas tentativas. Aguarde alguns minutos." };
    if (error.code === "weak_password") return { errors: { password: ["Senha muito fraca. Escolha outra."] } };
    console.error("[signup]", error.code, error.message);
    return { message: "Não foi possível criar a conta agora. Tente novamente.", values: echoValues(formData) };
  }

  // Supabase devolve identidades vazias quando o e-mail já está cadastrado
  // (resposta neutra para não revelar contas existentes).
  const isNew = !!data.user && (data.user.identities?.length ?? 0) > 0;
  if (isNew && data.user) {
    const { termsVersion } = await getSettings();
    await db.consentRecord.createMany({
      data: [
        { userId: data.user.id, type: "TERMS", version: termsVersion, accepted: true },
        { userId: data.user.id, type: "PRIVACY", version: termsVersion, accepted: true },
        { userId: data.user.id, type: "MARKETING", version: termsVersion, accepted: marketing === "on" },
      ],
    });
  }

  if (data.session) redirect(role === "PROVIDER" ? "/profissional" : safeRedirectPath(formData.get("redirect"), "/conta"));

  return {
    ok: true,
    message: "Enviamos um link de confirmação para o seu e-mail. Abra-o para ativar a conta.",
  };
}

export async function signInAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values: echoValues(formData) };

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    if (error?.code === "email_not_confirmed") return { message: "Confirme seu e-mail antes de entrar (veja sua caixa de entrada)." };
    if (error?.status === 429) return { message: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };
    return { message: "E-mail ou senha incorretos.", values: echoValues(formData) };
  }

  const profile = await db.user.findUnique({ where: { id: data.user.id }, select: { role: true, status: true } });
  if (!profile || profile.status !== "ACTIVE") {
    await supabase.auth.signOut();
    return { message: "Esta conta está suspensa. Fale com o suporte." };
  }

  redirect(safeRedirectPath(formData.get("redirect"), HOME_BY_ROLE[profile.role]));
}

export async function requestPasswordResetAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env().NEXT_PUBLIC_SITE_URL}/auth/callback?next=/redefinir-senha`,
  });
  if (error?.status === 429) return { message: "Muitas solicitações. Aguarde alguns minutos." };
  if (error) console.error("[password-reset]", error.code, error.message);

  // Mesma resposta exista ou não a conta (não revela e-mails cadastrados).
  return { ok: true, message: "Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha." };
}

export async function updatePasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: "O link expirou. Solicite uma nova redefinição de senha." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { errors: { password: ["Use uma senha diferente da atual."] } };
    return { message: "Não foi possível atualizar a senha. Tente novamente." };
  }

  const profile = await db.user.findUnique({ where: { id: user.id }, select: { role: true } });
  redirect(profile ? HOME_BY_ROLE[profile.role] : "/");
}
