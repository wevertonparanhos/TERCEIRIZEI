"use server";

import { prisma } from "@terceirizei/db";
import { generateAccessLink, getOrigin } from "@/lib/invite-user";
import { sendEmail } from "@/lib/email";
import { passwordResetEmail, portalAccessEmail } from "@/lib/email-templates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * "Esqueci minha senha": gera um link nosso (/auth/confirm) e envia por e-mail pelo mesmo serviço dos demais avisos.
 * Se o envio falhar, tenta o e-mail do próprio Supabase como alternativa. A resposta à tela é sempre a mesma,
 * exista o e-mail ou não, para não revelar quem tem cadastro.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return;

  const user = await prisma.user.findUnique({ where: { email: clean }, select: { name: true, active: true, clientId: true } });
  if (!user || !user.active || clean.endsWith(".invalid")) return;

  let emailed = false;
  try {
    const link = await generateAccessLink(clean);
    const message = user.clientId
      ? portalAccessEmail({ clientName: user.name, link, mode: "reset" })
      : passwordResetEmail({ name: user.name, link });
    emailed = await sendEmail({ to: clean, subject: message.subject, html: message.html });
  } catch (err) {
    console.error("[esqueci-senha] falha ao gerar/enviar o link próprio:", err);
  }

  if (!emailed) {
    try {
      const supabase = createSupabaseServerClient();
      await supabase.auth.resetPasswordForEmail(clean, { redirectTo: `${getOrigin()}/auth/callback?next=/redefinir-senha` });
    } catch (err) {
      console.error("[esqueci-senha] falha no e-mail alternativo do Supabase:", err);
    }
  }
}
