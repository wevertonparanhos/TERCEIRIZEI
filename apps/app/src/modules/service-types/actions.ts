"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import {
  serviceTypeSchema,
  checklistTemplateItemSchema,
  type ServiceTypeInput,
  type ChecklistTemplateItemInput,
} from "@/lib/validations/service-type";

// A conexão do Prisma bypassa RLS (role postgres) — tenant_id explícito em todo
// where/data abaixo é a real fronteira de isolamento nesta camada.
async function requireManageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR"].includes(user.role)) {
    throw new Error("Você não tem permissão para gerenciar modelos de processo.");
  }
  return user;
}

export async function createServiceType(input: ServiceTypeInput) {
  const user = await requireManageAccess();
  const data = serviceTypeSchema.parse(input);

  const serviceType = await prisma.serviceType.create({
    data: {
      tenantId: user.tenantId,
      name: data.name,
      defaultPrice: data.defaultPrice ? Number(data.defaultPrice) : null,
      defaultDeadlineDays: data.defaultDeadlineDays ? Number(data.defaultDeadlineDays) : null,
      defaultPriority: data.defaultPriority || null,
      defaultNotes: data.defaultNotes || null,
    },
  });

  revalidatePath("/servicos");
  return { id: serviceType.id };
}

export async function updateServiceType(serviceTypeId: string, input: ServiceTypeInput) {
  const user = await requireManageAccess();
  const data = serviceTypeSchema.parse(input);

  const result = await prisma.serviceType.updateMany({
    where: { id: serviceTypeId, tenantId: user.tenantId },
    data: {
      name: data.name,
      defaultPrice: data.defaultPrice ? Number(data.defaultPrice) : null,
      defaultDeadlineDays: data.defaultDeadlineDays ? Number(data.defaultDeadlineDays) : null,
      defaultPriority: data.defaultPriority || null,
      defaultNotes: data.defaultNotes || null,
    },
  });
  if (result.count === 0) throw new Error("Modelo não encontrado.");

  revalidatePath("/servicos");
  revalidatePath(`/servicos/${serviceTypeId}`);
}

export async function toggleServiceTypeActive(serviceTypeId: string, active: boolean) {
  const user = await requireManageAccess();

  const result = await prisma.serviceType.updateMany({
    where: { id: serviceTypeId, tenantId: user.tenantId },
    data: { active },
  });
  if (result.count === 0) throw new Error("Modelo não encontrado.");

  revalidatePath("/servicos");
  revalidatePath(`/servicos/${serviceTypeId}`);
}

async function loadServiceTypeForWrite(serviceTypeId: string, user: CurrentUser) {
  const serviceType = await prisma.serviceType.findFirst({
    where: { id: serviceTypeId, tenantId: user.tenantId },
  });
  if (!serviceType) throw new Error("Modelo não encontrado.");
  return serviceType;
}

export async function addChecklistTemplateItem(serviceTypeId: string, input: ChecklistTemplateItemInput) {
  const user = await requireManageAccess();
  await loadServiceTypeForWrite(serviceTypeId, user);
  const data = checklistTemplateItemSchema.parse(input);

  const last = await prisma.serviceChecklistTemplateItem.findFirst({
    where: { serviceTypeId },
    orderBy: { position: "desc" },
  });

  await prisma.serviceChecklistTemplateItem.create({
    data: {
      serviceTypeId,
      label: data.label,
      category: data.category?.trim() || null,
      position: (last?.position ?? 0) + 1,
    },
  });

  revalidatePath(`/servicos/${serviceTypeId}`);
}

export async function removeChecklistTemplateItem(serviceTypeId: string, itemId: string) {
  const user = await requireManageAccess();
  await loadServiceTypeForWrite(serviceTypeId, user);

  await prisma.serviceChecklistTemplateItem.delete({ where: { id: itemId, serviceTypeId } });

  revalidatePath(`/servicos/${serviceTypeId}`);
}

async function swapItemPositions(itemAId: string, itemBId: string) {
  const [a, b] = await Promise.all([
    prisma.serviceChecklistTemplateItem.findUniqueOrThrow({ where: { id: itemAId } }),
    prisma.serviceChecklistTemplateItem.findUniqueOrThrow({ where: { id: itemBId } }),
  ]);

  await prisma.$transaction([
    prisma.serviceChecklistTemplateItem.update({ where: { id: a.id }, data: { position: -1 } }),
    prisma.serviceChecklistTemplateItem.update({ where: { id: b.id }, data: { position: a.position } }),
    prisma.serviceChecklistTemplateItem.update({ where: { id: a.id }, data: { position: b.position } }),
  ]);
}

export async function moveChecklistTemplateItem(serviceTypeId: string, itemId: string, direction: "up" | "down") {
  const user = await requireManageAccess();
  await loadServiceTypeForWrite(serviceTypeId, user);

  const items = await prisma.serviceChecklistTemplateItem.findMany({
    where: { serviceTypeId },
    orderBy: { position: "asc" },
  });
  const index = items.findIndex((i) => i.id === itemId);
  if (index === -1) throw new Error("Item não encontrado.");

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return;

  await swapItemPositions(items[index].id, items[targetIndex].id);

  revalidatePath(`/servicos/${serviceTypeId}`);
}
