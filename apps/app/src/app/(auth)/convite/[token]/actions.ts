"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolveInvite } from "@/lib/invite-user";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";

export type CreatePasswordResult = { ok: true } | { ok: false; error: string };

/** Define a senha de quem abriu o link do convite. O e-mail já fica confirmado: nada a confirmar por e-mail. */
export async function createPasswordWithInvite(token: string, input: ResetPasswordInput): Promise<CreatePasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira a senha informada." };

  const invite = await resolveInvite(token);
  if (!invite) return { ok: false, error: "Este link venceu ou já foi usado. Peça um novo link a quem convidou você." };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(invite.userId, { password: parsed.data.password, email_confirm: true });
  if (error) {
    console.error("[convite] falha ao definir a senha:", error.message);
    return { ok: false, error: "Não foi possível salvar a senha. Tente novamente em instantes." };
  }
  return { ok: true };
}
