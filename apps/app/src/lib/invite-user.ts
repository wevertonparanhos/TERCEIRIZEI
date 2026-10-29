import "server-only";
import { headers } from "next/headers";
import { prisma } from "@terceirizei/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { buildInviteLink, createInviteToken, readInviteToken } from "@/lib/invite-token";

export function getOrigin(): string {
  const host = headers().get("host") ?? "";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

const INVITE_TTL_HOURS = 24 * 7;

/** Impressão da senha atual: muda quando a senha é trocada, o que invalida os links já emitidos. */
async function passwordFingerprint(userId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ f: string }[]>`select md5(coalesce(encrypted_password, '')) as f from auth.users where id = ${userId}::uuid`;
  return rows[0]?.f ?? null;
}

/**
 * Gera um link novo para a pessoa criar a senha de acesso — serve para convite, reenvio e redefinição.
 * O link abre /convite/<token>: só pede a senha e já entra, sem confirmação por e-mail. Vale por 7 dias
 * (ou o prazo informado) e deixa de valer assim que a senha é criada.
 */
export async function generateAccessLink(email: string, ttlHours = INVITE_TTL_HOURS): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
  const fingerprint = user ? await passwordFingerprint(user.id) : null;
  if (!user || fingerprint === null) throw new Error("Não foi possível gerar o link de acesso.");
  const token = createInviteToken({ userId: user.id, fingerprint, ttlHours, secret: env.supabaseServiceRoleKey() });
  return buildInviteLink(getOrigin(), token);
}

export type ResolvedInvite = { userId: string; email: string; name: string; isClient: boolean };

/** Valida o token do link (assinatura, validade, uso único e usuário ativo). */
export async function resolveInvite(token: string): Promise<ResolvedInvite | null> {
  const payload = readInviteToken(token, env.supabaseServiceRoleKey());
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.u }, select: { id: true, email: true, name: true, active: true, clientId: true } });
  if (!user || !user.active || user.email.endsWith(".invalid")) return null;
  if ((await passwordFingerprint(user.id)) !== payload.f) return null;
  return { userId: user.id, email: user.email, name: user.name, isClient: user.clientId !== null };
}

/**
 * Cria um usuário Auth direto via SQL e gera um link de convite (recovery)
 * pra pessoa definir a própria senha.
 *
 * A API padrão do Supabase (admin.createUser/inviteUserByEmail) descarta o
 * app_metadata customizado neste projeto (confirmado na Etapa 2 com um
 * trigger de debug — só grava {provider, providers}), o que quebraria a
 * atribuição de tenant_id/role_id pelo trigger handle_new_auth_user. Por
 * isso a inserção é direta via SQL, igual ao padrão já usado pra criar
 * usuários de teste em todas as etapas anteriores — só que agora como
 * código de produção. generateLink(type: "recovery") não sofre desse bug
 * porque não grava app_metadata nenhum, só emite um token pro usuário que
 * já existe.
 */
export async function provisionInvitedUser(params: {
  email: string;
  name: string;
  tenantId: string;
  roleId: string;
}): Promise<string> {
  const randomPassword = crypto.randomUUID() + crypto.randomUUID();

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    with new_user as (
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
        ${params.email}, crypt(${randomPassword}, gen_salt('bf')), now(),
        jsonb_build_object('tenant_id', ${params.tenantId}::text, 'role_id', ${params.roleId}::text, 'provider', 'email', 'providers', array['email']),
        jsonb_build_object('name', ${params.name}),
        now(), now(), '', '', '', ''
      )
      returning id, email
    )
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    select gen_random_uuid(), id, id::text, jsonb_build_object('sub', id::text, 'email', email), 'email', now(), now(), now()
    from new_user
    returning user_id as id
  `;
  if (rows.length === 0) throw new Error("Não foi possível criar o usuário.");

  try {
    return await generateAccessLink(params.email);
  } catch {
    throw new Error("Usuário criado, mas não foi possível gerar o link de convite.");
  }
}
