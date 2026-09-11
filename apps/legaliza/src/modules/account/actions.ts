"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@legaliza/db";
import { requireUser } from "@/lib/rbac";

export async function updateProfile(name: string) {
  const user = await requireUser();
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error("Informe um nome válido.");

  await prisma.user.update({ where: { id: user.id }, data: { name: trimmed } });

  revalidatePath("/portal/perfil");
}
