"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { serviceTypeSchema, type ServiceTypeInput } from "@/lib/validations/service-type";

// A conexão do Prisma bypassa RLS — tenant_id explícito em todo where/data é a fronteira real.
async function requireManageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR"].includes(user.role)) throw new Error("Você não tem permissão para editar os modelos.");
  return user;
}

function refresh() {
  revalidatePath("/processos");
  revalidatePath("/processos/modelos");
}

/** Cria (id = null) ou atualiza um modelo de tarefa, com o checklist padrão. */
export async function saveServiceType(id: string | null, input: ServiceTypeInput): Promise<{ id: string }> {
  const user = await requireManageAccess();
  const data = serviceTypeSchema.parse(input);

  const duplicate = await prisma.serviceType.findFirst({
    where: { tenantId: user.tenantId, name: { equals: data.name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (duplicate) throw new Error("Já existe um modelo com esse nome.");

  const values = {
    name: data.name,
    defaultPrice: data.defaultPrice,
    defaultDeadlineDays: data.defaultDeadlineDays,
    defaultPriority: data.defaultPriority,
    defaultNotes: data.defaultNotes.trim() || null,
    active: data.active,
  };

  const saved = await prisma.$transaction(async (tx) => {
    let serviceTypeId = id;
    if (id) {
      const found = await tx.serviceType.updateMany({ where: { id, tenantId: user.tenantId }, data: values });
      if (found.count === 0) throw new Error("Modelo não encontrado.");
    } else {
      const created = await tx.serviceType.create({ data: { tenantId: user.tenantId, ...values }, select: { id: true } });
      serviceTypeId = created.id;
    }
    // O checklist é recriado inteiro; tarefas já abertas guardam a própria cópia e não mudam.
    await tx.serviceChecklistTemplateItem.deleteMany({ where: { serviceTypeId: serviceTypeId! } });
    if (data.checklist.length > 0) {
      await tx.serviceChecklistTemplateItem.createMany({
        data: data.checklist.map((item, position) => ({ serviceTypeId: serviceTypeId!, label: item.label, position })),
      });
    }
    return { id: serviceTypeId! };
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: id ? "service_type.update" : "service_type.create",
    entityType: "service_type",
    entityId: saved.id,
    description: `Modelo de tarefa "${data.name}" ${id ? "atualizado" : "criado"}.`,
  });

  refresh();
  return saved;
}

/** Ativa ou desativa o modelo (desativado some da Nova Tarefa, mas as tarefas antigas continuam com ele). */
export async function setServiceTypeActive(id: string, active: boolean) {
  const user = await requireManageAccess();
  const result = await prisma.serviceType.updateMany({ where: { id, tenantId: user.tenantId }, data: { active } });
  if (result.count === 0) throw new Error("Modelo não encontrado.");
  refresh();
}

/** Exclui o modelo — só se nenhuma tarefa ou pedido do portal usar. Senão, desative. */
export async function deleteServiceType(id: string) {
  const user = await requireManageAccess();
  const type = await prisma.serviceType.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, name: true } });
  if (!type) throw new Error("Modelo não encontrado.");

  const [tasks, requests] = await Promise.all([prisma.process.count({ where: { serviceTypeId: id } }), prisma.portalRequest.count({ where: { serviceTypeId: id } })]);
  if (tasks + requests > 0) {
    throw new Error(`Este modelo está em uso (${tasks} tarefa(s), ${requests} pedido(s) do portal). Desative-o em vez de excluir.`);
  }

  await prisma.serviceType.delete({ where: { id } });
  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "service_type.delete",
    entityType: "service_type",
    entityId: id,
    description: `Modelo de tarefa "${type.name}" excluído.`,
  });
  refresh();
}
