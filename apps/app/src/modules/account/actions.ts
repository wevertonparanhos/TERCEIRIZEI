"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { profileSchema, type ProfileInput } from "@/lib/validations/account";

export async function updateProfile(input: ProfileInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Não autenticado.");
  const data = profileSchema.parse(input);

  await prisma.user.update({ where: { id: user.id }, data: { name: data.name } });

  revalidatePath("/perfil");
  revalidatePath("/portal/perfil");
}
