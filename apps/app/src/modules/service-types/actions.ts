"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { serviceTypeSchema, type ServiceTypeInput } from "@/lib/validations/service-type";

// Em produção o Next esconde a mensagem de erros lançados por Server Actions, então os avisos esperados
// (sem permissão, nome repetido, modelo em uso) voltam como resultado e a tela mostra o texto.
export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const NO_PERMISSION = "Você não tem permissão para editar os modelos.";

// A conexão do Prisma bypassa RLS — tenant_id explícito em todo where/data é a fronteira real.
async function manageAccess(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && ["ADMIN", "GESTOR"].includes(user.role) ? user : null;
}

function refresh() {
  revalidatePath("/processos");
  revalidatePath("/processos/modelos");
}

/** Cria (id = null) ou atualiza um modelo de tarefa, com o checklist padrão. */
export async function saveServiceType(id: string | null, input: ServiceTypeInput): Promise<ActionResult<{ id: string }>> {
  const user = await manageAccess();
  if (!user) return fail(NO_PERMISSION);
  const parsed = serviceTypeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Confira os dados do modelo.");
  const data = parsed.data;

  const duplicate = await prisma.serviceType.findFirst({
    where: { tenantId: user.tenantId, name: { equals: data.name, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (duplicate) return fail("Já existe um modelo com esse nome.");

  const values = {
    name: data.name,
    defaultPrice: data.defaultPrice,
    defaultDeadlineDays: data.defaultDeadlineDays,
    defaultPriority: data.defaultPriority,
    defaultNotes: data.defaultNotes.trim() || null,
    active: data.active,
  };

  const saved = await prisma.$transaction(async (tx): Promise<{ id: string } | null> => {
    let serviceTypeId = id;
    if (id) {
      const found = await tx.serviceType.updateMany({ where: { id, tenantId: user.tenantId }, data: values });
      if (found.count === 0) return null;
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
  if (!saved) return fail("Modelo não encontrado. Atualize a página.");

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: id ? "service_type.update" : "service_type.create",
    entityType: "service_type",
    entityId: saved.id,
    description: `Modelo de tarefa "${data.name}" ${id ? "atualizado" : "criado"}.`,
  });

  refresh();
  return { ok: true, id: saved.id };
}

/** Ativa ou desativa o modelo (desativado some da Nova Tarefa, mas as tarefas antigas continuam com ele). */
export async function setServiceTypeActive(id: string, active: boolean): Promise<ActionResult> {
  const user = await manageAccess();
  if (!user) return fail(NO_PERMISSION);
  const result = await prisma.serviceType.updateMany({ where: { id, tenantId: user.tenantId }, data: { active } });
  if (result.count === 0) return fail("Modelo não encontrado. Atualize a página.");
  refresh();
  return { ok: true };
}

/** Exclui o modelo — só se nenhuma tarefa ou pedido do portal usar. Senão, desative. */
export async function deleteServiceType(id: string): Promise<ActionResult> {
  const user = await manageAccess();
  if (!user) return fail(NO_PERMISSION);
  const type = await prisma.serviceType.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, name: true } });
  if (!type) return fail("Modelo não encontrado. Atualize a página.");

  const [tasks, requests] = await Promise.all([prisma.process.count({ where: { serviceTypeId: id } }), prisma.portalRequest.count({ where: { serviceTypeId: id } })]);
  if (tasks + requests > 0) {
    const uso = [tasks > 0 ? `${tasks} tarefa(s)` : null, requests > 0 ? `${requests} pedido(s) do portal` : null].filter(Boolean).join(" e ");
    return fail(`Este modelo está em uso (${uso}) e não pode ser excluído. Clique em Desativar: ele some da Nova Tarefa e as tarefas antigas continuam com ele.`);
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
  return { ok: true };
}
