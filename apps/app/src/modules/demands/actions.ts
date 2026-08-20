"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { demandSchema, DEMAND_STATUSES, type DemandInput } from "@/lib/validations/demand";

type DemandStatus = (typeof DEMAND_STATUSES)[number];

// A conexão do Prisma bypassa RLS (role postgres) — tenant_id explícito em todo
// where/data abaixo é a real fronteira de isolamento nesta camada.
async function requireStaff(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  return user;
}

async function requireManageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR"].includes(user.role)) {
    throw new Error("Você não tem permissão para esta ação.");
  }
  return user;
}

async function nextDemandNumber(tenantId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    insert into tenant_counters (tenant_id, key, value)
    values (${tenantId}::uuid, 'demand', 1)
    on conflict (tenant_id, key) do update set value = tenant_counters.value + 1
    returning value
  `;
  return rows[0].value;
}

export async function createDemand(input: DemandInput) {
  const user = await requireManageAccess();
  const data = demandSchema.parse(input);

  const client = await prisma.client.findFirst({
    where: { id: data.clientId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!client) throw new Error("Cliente não encontrado.");

  const number = await nextDemandNumber(user.tenantId);

  const demand = await prisma.demand.create({
    data: {
      tenantId: user.tenantId,
      number,
      clientId: data.clientId,
      companyId: data.companyId || null,
      serviceTypeId: data.serviceTypeId,
      description: data.description,
      priority: data.priority,
      requestedDeadline: data.requestedDeadline ? new Date(data.requestedDeadline) : null,
      notes: data.notes || null,
    },
  });

  await prisma.demandStatusHistory.create({
    data: { demandId: demand.id, fromStatus: null, toStatus: "NOVA", userId: user.id },
  });

  revalidatePath("/demandas");
  return { id: demand.id };
}

export async function updateDemandStatus(demandId: string, toStatus: DemandStatus) {
  const user = await requireStaff();

  const demand = await prisma.demand.findFirst({ where: { id: demandId, tenantId: user.tenantId } });
  if (!demand) throw new Error("Demanda não encontrada.");

  if (user.role === "OPERACIONAL" && demand.assignedUserId !== user.id) {
    throw new Error("Você só pode atualizar demandas atribuídas a você.");
  }

  if (demand.status === toStatus) return;

  await prisma.$transaction([
    prisma.demand.update({ where: { id: demandId }, data: { status: toStatus } }),
    prisma.demandStatusHistory.create({
      data: { demandId, fromStatus: demand.status, toStatus, userId: user.id },
    }),
  ]);

  revalidatePath(`/demandas/${demandId}`);
  revalidatePath("/demandas");
}

export async function assignDemand(demandId: string, assignedUserId: string) {
  const user = await requireManageAccess();

  const result = await prisma.demand.updateMany({
    where: { id: demandId, tenantId: user.tenantId },
    data: { assignedUserId: assignedUserId || null },
  });
  if (result.count === 0) throw new Error("Demanda não encontrada.");

  revalidatePath(`/demandas/${demandId}`);
  revalidatePath("/demandas");
}
