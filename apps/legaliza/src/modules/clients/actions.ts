"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { clientSchema, type ClientInput } from "@/lib/validations/client";

const INSTANCE_ID = "00000000-0000-0000-0000-000000000000";

// A conexão do Prisma usa a role postgres do Supabase (bypassa RLS) — tenant_id
// explícito em todo where/data abaixo é a real fronteira de isolamento nesta
// camada, não a RLS (mesmo padrão documentado no Terceirizei OS).
async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

function rethrowFriendly(err: unknown, duplicateMessage: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new Error(duplicateMessage);
  }
  throw err;
}

export async function createClient(input: ClientInput) {
  const user = await requireWriteAccess();
  const data = clientSchema.parse(input);

  let client;
  try {
    client = await prisma.client.create({
      data: {
        tenantId: user.tenantId!,
        name: data.name,
        fantasyName: data.fantasyName || null,
        type: data.type,
        doc: data.doc.replace(/\D/g, ""),
        email: data.email,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        status: data.status,
      },
    });
  } catch (err) {
    rethrowFriendly(err, "Já existe um cliente cadastrado com este CPF/CNPJ.");
  }

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "client.create",
    entityType: "client",
    entityId: client.id,
    description: `Cliente "${client.name}" cadastrado.`,
  });

  revalidatePath("/clientes");
  return { id: client.id };
}

export async function updateClient(clientId: string, input: ClientInput) {
  const user = await requireWriteAccess();
  const data = clientSchema.parse(input);

  let result;
  try {
    result = await prisma.client.updateMany({
      where: { id: clientId, tenantId: user.tenantId! },
      data: {
        name: data.name,
        fantasyName: data.fantasyName || null,
        type: data.type,
        doc: data.doc.replace(/\D/g, ""),
        email: data.email,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        status: data.status,
      },
    });
  } catch (err) {
    rethrowFriendly(err, "Já existe um cliente cadastrado com este CPF/CNPJ.");
  }

  if (result.count === 0) throw new Error("Cliente não encontrado.");

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "client.update",
    entityType: "client",
    entityId: clientId,
    description: `Cliente "${data.name}" atualizado.`,
  });

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
}

// ---------- Acesso ao Portal do Cliente ----------

// Sem envio de e-mail (sem SMTP configurado neste projeto Supabase) — senha
// temporária gerada e exibida uma vez na tela pro operador repassar. Mesma
// técnica de insert direto em auth.users/auth.identities do seed.ts
// (ensureAuthUser) — a Admin API do Supabase ignora app_metadata custom
// nesta stack (achado da Fase 1).
export async function inviteClientPortalUser(clientId: string, input: { name: string; email: string }) {
  const user = await requireWriteAccess();

  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: user.tenantId! } });
  if (!client) throw new Error("Cliente não encontrado.");

  const existingPortalUser = await prisma.user.findFirst({ where: { clientId } });
  if (existingPortalUser) throw new Error("Este cliente já tem acesso ao portal.");

  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) throw new Error("Já existe um usuário cadastrado com este e-mail.");

  const clientRole = await prisma.role.findUnique({ where: { name: "CLIENT" } });
  if (!clientRole) throw new Error("Papel CLIENT não encontrado.");

  const temporaryPassword = randomBytes(9).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
  const authUserId = randomUUID();

  await prisma.$executeRawUnsafe(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
     values ($1::uuid, $2::uuid, 'authenticated', 'authenticated', $3, crypt($4, gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, now(), now())`,
    INSTANCE_ID,
    authUserId,
    input.email,
    temporaryPassword
  );
  await prisma.$executeRawUnsafe(
    `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values ($1, $2::uuid, jsonb_build_object('sub', $1, 'email', $3, 'email_verified', true), 'email', now(), now(), now())`,
    authUserId,
    authUserId,
    input.email
  );

  await prisma.user.create({
    data: {
      id: authUserId,
      tenantId: user.tenantId!,
      roleId: clientRole.id,
      clientId,
      name: input.name,
      email: input.email,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "client.portal_access_granted",
    entityType: "client",
    entityId: clientId,
    description: `Acesso ao portal criado pra "${input.name}" (${input.email}).`,
  });

  revalidatePath(`/clientes/${clientId}`);
  return { email: input.email, temporaryPassword };
}
