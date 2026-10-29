"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { provisionInvitedUser, generateAccessLink } from "@/lib/invite-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { inviteStaffSchema, type InviteStaffInput } from "@/lib/validations/team";
import { STAFF_ROLES, ROLE_LABELS } from "@/modules/team/permissions";

async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("Só o administrador pode gerenciar a equipe.");
  }
  return user;
}

export async function inviteStaffMember(input: InviteStaffInput) {
  const user = await requireAdmin();
  const data = inviteStaffSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("Já existe um usuário com este e-mail.");

  const role = await prisma.role.findUnique({ where: { name: data.role } });
  if (!role) throw new Error("Papel inválido.");

  const inviteLink = await provisionInvitedUser({
    email: data.email,
    name: data.name,
    tenantId: user.tenantId,
    roleId: role.id,
  });

  const newUser = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "team.invite",
    entityType: "user",
    entityId: newUser?.id,
    description: `Convite criado para ${data.name} (${data.email}) como ${data.role}.`,
  });

  revalidatePath("/equipe");
  return { inviteLink };
}

export async function deactivateStaffMember(userId: string) {
  const user = await requireAdmin();
  if (userId === user.id) throw new Error("Você não pode desativar a si mesmo.");

  const target = await loadStaffTarget(userId, user.tenantId);
  await assertNotLastAdmin(target, user.tenantId);

  await prisma.user.update({ where: { id: userId }, data: { active: false } });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "team.deactivate",
    entityType: "user",
    entityId: userId,
    description: `Membro da equipe desativado (${target.name}).`,
  });

  revalidatePath("/equipe");
}

export async function reactivateStaffMember(userId: string) {
  const user = await requireAdmin();
  const target = await loadStaffTarget(userId, user.tenantId);
  if (target.email.endsWith(".invalid")) {
    throw new Error("Este membro veio da migração só para manter o histórico e não tem e-mail real para entrar.");
  }

  await prisma.user.update({ where: { id: userId }, data: { active: true } });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "team.reactivate",
    entityType: "user",
    entityId: userId,
    description: `Membro da equipe reativado (${target.name}).`,
  });

  revalidatePath("/equipe");
}

/** Dá acesso de verdade a um membro que veio da migração só como histórico: troca o e-mail provisório
 * por um real, reativa e devolve um link para a pessoa definir a senha. O histórico dele (comentários,
 * tarefas) continua com o mesmo nome. */
export async function activateMigratedMember(userId: string, email: string): Promise<{ inviteLink: string }> {
  const user = await requireAdmin();
  const clean = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("E-mail inválido.");

  const target = await loadStaffTarget(userId, user.tenantId);
  if (!target.email.endsWith(".invalid")) throw new Error("Este membro já tem um e-mail real.");
  const taken = await prisma.user.findUnique({ where: { email: clean }, select: { id: true } });
  if (taken) throw new Error("Já existe um usuário com este e-mail.");

  await prisma.$transaction([
    prisma.$executeRaw`
      update auth.users
         set email = ${clean}::text, email_confirmed_at = now(), banned_until = null, updated_at = now()
       where id = ${userId}::uuid`,
    prisma.$executeRaw`
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      select gen_random_uuid(), ${userId}::uuid, ${userId}::text, jsonb_build_object('sub', ${userId}::text, 'email', ${clean}::text), 'email', now(), now(), now()
       where not exists (select 1 from auth.identities where user_id = ${userId}::uuid)`,
    prisma.user.update({ where: { id: userId }, data: { email: clean, active: true } }),
  ]);

  let inviteLink: string;
  try {
    inviteLink = await generateAccessLink(clean);
  } catch {
    throw new Error("Membro ativado, mas não foi possível gerar o link de acesso. Use \"Esqueci minha senha\" no login.");
  }

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "team.activate_migrated",
    entityType: "user",
    entityId: userId,
    description: `${target.name}: membro migrado ativado com o e-mail ${clean}.`,
  });

  revalidatePath("/equipe");
  return { inviteLink };
}

/** Troca o papel de um membro. O acesso de cada papel está em modules/team/permissions.ts. */
export async function changeStaffRole(userId: string, roleName: string) {
  const user = await requireAdmin();
  if (!(STAFF_ROLES as string[]).includes(roleName)) throw new Error("Papel inválido.");
  if (userId === user.id) throw new Error("Você não pode alterar o seu próprio papel.");

  const target = await loadStaffTarget(userId, user.tenantId);
  if (target.role.name === roleName) return;
  if (target.role.name === "ADMIN" && !target.active) {
    // admin desativado não conta como "último administrador" — pode mudar sem travar o sistema
  }
  if (target.role.name === "ADMIN") await assertNotLastAdmin(target, user.tenantId);

  const role = await prisma.role.findUnique({ where: { name: roleName as (typeof STAFF_ROLES)[number] } });
  if (!role) throw new Error("Papel inválido.");

  await prisma.user.update({ where: { id: userId }, data: { roleId: role.id } });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "team.change_role",
    entityType: "user",
    entityId: userId,
    description: `${target.name}: papel alterado de ${ROLE_LABELS[target.role.name] ?? target.role.name} para ${ROLE_LABELS[roleName]}.`,
  });

  revalidatePath("/equipe");
  revalidatePath(`/equipe/${userId}`);
}

/** Remove o membro da equipe. Sem histórico (nada escrito por ele), o usuário é apagado de vez;
 * com histórico (comentários, movimentações, auditoria), ele é só desativado — assim o que ele fez
 * continua com o nome dele. Em ambos os casos sai da lista de responsáveis das tarefas. */
export async function removeStaffMember(userId: string): Promise<{ deleted: boolean }> {
  const user = await requireAdmin();
  if (userId === user.id) throw new Error("Você não pode remover a si mesmo.");

  const target = await loadStaffTarget(userId, user.tenantId);
  await assertNotLastAdmin(target, user.tenantId);

  // Sai das tarefas e das marcas de presença/leitura (não são histórico).
  await prisma.$transaction([
    prisma.processAssignee.deleteMany({ where: { userId } }),
    prisma.processPresence.deleteMany({ where: { userId } }),
    prisma.processCommentRead.deleteMany({ where: { userId } }),
    prisma.processCommentMention.deleteMany({ where: { mentionedUserId: userId } }),
  ]);

  let deleted = false;
  try {
    await prisma.user.delete({ where: { id: userId } });
    deleted = true;
  } catch {
    // Tem histórico ligado ao nome dele: mantém desativado.
    await prisma.user.update({ where: { id: userId }, data: { active: false } });
  }

  if (deleted) {
    try {
      await createSupabaseAdminClient().auth.admin.deleteUser(userId);
    } catch (err) {
      console.error("[equipe] usuário removido do sistema, mas não do login:", err);
    }
  }

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: deleted ? "team.delete" : "team.deactivate",
    entityType: "user",
    entityId: deleted ? undefined : userId,
    description: deleted
      ? `Membro removido da equipe (${target.name}).`
      : `Membro removido da equipe (${target.name}); mantido desativado por ter histórico.`,
  });

  revalidatePath("/equipe");
  revalidatePath("/processos");
  return { deleted };
}

async function loadStaffTarget(userId: string, tenantId: string) {
  const target = await prisma.user.findFirst({
    where: { id: userId, tenantId, clientId: null },
    include: { role: { select: { name: true } } },
  });
  if (!target) throw new Error("Membro não encontrado.");
  return target;
}

/** Nunca deixa o sistema sem nenhum administrador ativo. */
async function assertNotLastAdmin(target: { id: string; role: { name: string } }, tenantId: string) {
  if (target.role.name !== "ADMIN") return;
  const otherAdmins = await prisma.user.count({
    where: { tenantId, clientId: null, active: true, id: { not: target.id }, role: { name: "ADMIN" } },
  });
  if (otherAdmins === 0) throw new Error("É preciso manter pelo menos um administrador ativo.");
}
