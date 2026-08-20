import "server-only";
import { headers } from "next/headers";
import { prisma } from "@terceirizei/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function getOrigin(): string {
  const host = headers().get("host") ?? "";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
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

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: params.email,
    options: { redirectTo: `${getOrigin()}/auth/callback?next=/redefinir-senha` },
  });
  if (error || !data) throw new Error("Usuário criado, mas não foi possível gerar o link de convite.");

  return data.properties.action_link;
}
