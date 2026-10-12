import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { can, HOME_BY_ROLE, type Permission, type Role } from "@/domain/permissions";
import { db } from "./db";
import { supabaseServer } from "./supabase";

export type SessionUser = Pick<User, "id" | "email" | "name" | "phone" | "role" | "status">;

export class AuthorizationError extends Error {}

/** Usuário autenticado e ATIVO, lido do banco (o papel nunca vem do navegador). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, name: true, phone: true, role: true, status: true },
  });
  if (!profile || profile.status !== "ACTIVE") return null;
  return profile;
});

/** Para páginas: manda ao login ou à área correta do papel do usuário. */
export async function requirePageRole(roles: Role[], from: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/entrar?redirect=${encodeURIComponent(from)}`);
  if (!roles.includes(user.role)) redirect(HOME_BY_ROLE[user.role]);
  return user;
}

/** Para páginas administrativas: exige a permissão específica da página. */
export async function requirePagePermission(permission: Permission, from: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/entrar?redirect=${encodeURIComponent(from)}`);
  if (!can(user.role, permission)) redirect(HOME_BY_ROLE[user.role] === from ? "/" : HOME_BY_ROLE[user.role]);
  return user;
}

/** Para Server Actions: lança erro. Nunca confia em checagem feita na interface. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthorizationError("Faça login para continuar.");
  if (!can(user.role, permission)) throw new AuthorizationError("Você não tem permissão para esta ação.");
  return user;
}
