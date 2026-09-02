import { prisma } from "@legaliza/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const ROLES = ["SUPER_ADMIN", "TENANT_ADMIN", "OPERATOR", "CLIENT"] as const;
export type Role = (typeof ROLES)[number];

export type CurrentUser = {
  id: string;
  tenantId: string | null;
  name: string;
  email: string;
  role: Role;
};

// A conexão do Prisma usa a role postgres do Supabase (bypassa RLS) — tenant_id
// explícito em todo where/data das Server Actions é a real fronteira de
// isolamento nesta camada, não a RLS (mesmo padrão documentado no Terceirizei OS).
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

  if (!profile || !profile.active) return null;

  return {
    id: profile.id,
    tenantId: profile.tenantId,
    name: profile.name,
    email: profile.email,
    role: profile.role.name,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autenticado.");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new Error("Você não tem permissão para esta ação.");
  }
  return user;
}
