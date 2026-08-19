import { prisma } from "@terceirizei/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ROLES = ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO", "CLIENTE"] as const;
export type Role = (typeof ROLES)[number];

export type CurrentUser = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
};

/** Perfil de aplicação (public.users) do usuário autenticado na requisição atual, ou null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const profile = await prisma.user.findUnique({
    where: { id: authUser.id },
    include: { role: true },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    tenantId: profile.tenantId,
    name: profile.name,
    email: profile.email,
    role: profile.role.name,
  };
}

/** Checagem fina baseada na tabela role_permissions — usada conforme cada módulo declara seus recursos. */
export async function roleHasPermission(role: Role, resource: string, action: string) {
  const match = await prisma.rolePermission.findFirst({
    where: {
      role: { name: role },
      permission: { resource, action },
    },
  });
  return match !== null;
}
