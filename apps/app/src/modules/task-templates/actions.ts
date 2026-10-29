"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { taskTemplateSchema, type TaskTemplateInput } from "@/lib/validations/task-template";

// Em produção o Next esconde a mensagem de erros lançados por Server Actions, então os avisos esperados
// (sem permissão, nome repetido) voltam como resultado e a tela mostra o texto.
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
export async function saveTaskTemplate(id: string | null, input: TaskTemplateInput): Promise<ActionResult<{ id: string }>> {
  const user = await manageAccess();
  if (!user) return fail(NO_PERMISSION);
  const parsed = taskTemplateSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Confira os dados do modelo.");
  const data = parsed.data;

  const duplicate = await prisma.taskTemplate.findFirst({
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
    let templateId = id;
    if (id) {
      const found = await tx.taskTemplate.updateMany({ where: { id, tenantId: user.tenantId }, data: values });
      if (found.count === 0) return null;
    } else {
      const created = await tx.taskTemplate.create({ data: { tenantId: user.tenantId, ...values }, select: { id: true } });
      templateId = created.id;
    }
    // O checklist é recriado inteiro; tarefas já abertas guardam a própria cópia e não mudam.
    await tx.taskTemplateChecklistItem.deleteMany({ where: { templateId: templateId! } });
    if (data.checklist.length > 0) {
      await tx.taskTemplateChecklistItem.createMany({
        data: data.checklist.map((item, position) => ({ templateId: templateId!, label: item.label, position })),
      });
    }
    return { id: templateId! };
  });
  if (!saved) return fail("Modelo não encontrado. Atualize a página.");

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: id ? "task_template.update" : "task_template.create",
    entityType: "task_template",
    entityId: saved.id,
    description: `Modelo de tarefa "${data.name}" ${id ? "atualizado" : "criado"}.`,
  });

  refresh();
  return { ok: true, id: saved.id };
}

/** Ativa ou desativa o modelo (desativado some da Nova Tarefa). */
export async function setTaskTemplateActive(id: string, active: boolean): Promise<ActionResult> {
  const user = await manageAccess();
  if (!user) return fail(NO_PERMISSION);
  const result = await prisma.taskTemplate.updateMany({ where: { id, tenantId: user.tenantId }, data: { active } });
  if (result.count === 0) return fail("Modelo não encontrado. Atualize a página.");
  refresh();
  return { ok: true };
}

/** Exclui o modelo. As tarefas já criadas com ele não mudam: guardam a própria cópia. */
export async function deleteTaskTemplate(id: string): Promise<ActionResult> {
  const user = await manageAccess();
  if (!user) return fail(NO_PERMISSION);
  const template = await prisma.taskTemplate.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, name: true } });
  if (!template) return fail("Modelo não encontrado. Atualize a página.");

  await prisma.taskTemplate.delete({ where: { id } });
  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "task_template.delete",
    entityType: "task_template",
    entityId: id,
    description: `Modelo de tarefa "${template.name}" excluído.`,
  });
  refresh();
  return { ok: true };
}
