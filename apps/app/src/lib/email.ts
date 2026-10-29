import "server-only";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM ?? "Terceirizei OS <onboarding@resend.dev>";

/** Nunca lança — uma falha de e-mail (chave ausente, provedor fora do ar) não
 * pode derrubar a ação de negócio que disparou o aviso. */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY não configurada — e-mail não enviado: "${subject}" para ${to}`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error(`[email] Falha ao enviar "${subject}" para ${to}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Falha ao enviar "${subject}" para ${to}:`, err);
    return false;
  }
}
