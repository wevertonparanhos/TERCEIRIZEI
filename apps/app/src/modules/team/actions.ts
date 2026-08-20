"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { provisionInvitedUser } from "@/lib/invite-user";
import { inviteStaffSchema, type InviteStaffInput } from "@/lib/validations/team";

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

  const result = await prisma.user.updateMany({
    where: { id: userId, tenantId: user.tenantId },
    data: { active: false },
  });
  if (result.count === 0) throw new Error("Usuário não encontrado.");

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "team.deactivate",
    entityType: "user",
    entityId: userId,
    description: "Membro da equipe desativado.",
  });

  revalidatePath("/equipe");
}
