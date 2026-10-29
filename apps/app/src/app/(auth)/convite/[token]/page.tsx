import Link from "next/link";
import { resolveInvite } from "@/lib/invite-user";
import { InvitePasswordForm } from "./invite-password-form";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await resolveInvite(params.token).catch(() => null);

  if (!invite) {
    return (
      <div>
        <h1 className="mb-1 text-lg font-semibold text-ink">Link vencido ou já usado</h1>
        <p className="mb-6 text-sm text-muted">
          Este link de acesso não vale mais. Se você já criou a sua senha, é só entrar. Se não, peça um novo link a quem convidou você ou use
          &quot;Esqueci minha senha / primeiro acesso&quot;.
        </p>
        <Link href="/login" className="text-sm text-accent hover:underline">
          Ir para a tela de entrada
        </Link>
      </div>
    );
  }

  const firstName = invite.name.split(" ")[0];
  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-ink">{invite.isClient ? "Portal do Cliente" : "Criar senha de acesso"}</h1>
      <p className="mb-6 text-sm text-muted">
        {invite.isClient
          ? `Olá, ${firstName}! Crie a senha de acesso ao seu portal. Depois é só entrar com o seu e-mail e essa senha.`
          : `Olá, ${firstName}! Crie a sua senha para entrar no sistema. Não precisa confirmar nada por e-mail.`}
      </p>
      <InvitePasswordForm token={params.token} email={invite.email} />
    </div>
  );
}
