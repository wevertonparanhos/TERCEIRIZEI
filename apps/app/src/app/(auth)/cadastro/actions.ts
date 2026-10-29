"use server";

import { prisma } from "@terceirizei/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";

export type RegisterResult = { ok: true } | { ok: false; error: string };

const EXISTING_ACCOUNT =
  "Já existe uma conta com este e-mail. Entre com a sua senha ou, se ainda não criou uma (por exemplo, se foi convidado(a) pela equipe), use \"Esqueci minha senha\" na tela de entrada para definir a sua.";

/**
 * Cadastro de cliente pela página pública. A conta já nasce com o e-mail confirmado, então a pessoa
 * entra direto com a senha que acabou de criar, sem depender de e-mail de confirmação. O perfil CLIENTE
 * e o cadastro do cliente são criados pelo gatilho handle_new_auth_user no banco.
 */
export async function registerAccount(input: SignupInput): Promise<RegisterResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Confira os dados informados." };
  const data = parsed.data;
  const email = data.email.trim().toLowerCase();

  // Sem isto, o Supabase "finge" que cadastrou quando o e-mail já existe e a pessoa fica esperando um e-mail que nunca vem.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: EXISTING_ACCOUNT };

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: { name: data.name.trim(), doc: data.doc.replace(/\D/g, ""), phone: data.phone.trim() },
  });

  if (error) {
    if (error.code === "email_exists" || /already|registered/i.test(error.message)) return { ok: false, error: EXISTING_ACCOUNT };
    console.error("[cadastro] falha ao criar a conta:", error.message);
    return { ok: false, error: "Não foi possível concluir o cadastro. Tente novamente em instantes." };
  }

  return { ok: true };
}
