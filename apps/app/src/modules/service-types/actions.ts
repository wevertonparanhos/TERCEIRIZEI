"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { serviceTypeNameSchema } from "@/lib/validations/service-type";

// Tipo de solicitação = só uma etiqueta que identifica o serviço. Os valores padrão ficam nos Modelos de tarefa.
// Em produção o Next esconde a mensagem de erros lançados por Server Actions, então os avisos esperados voltam como resultado.
export type ActionResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

const NO_PERMISSION = "Você não tem permissão para editar os tipos de solicitação.";

// A conexão do Prisma bypassa RLS — tenant_id explícito em todo where/data é a fronteira real.
async function manageAccess(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  return user && ["ADMIN", "GESTOR"].includes(user.role) ? user : null;
}

function refresh() {
  revalidatePath("/processos");
  revalidatePath("/processos/tipos");
}

/** Cria (id = null) ou renomeia um tipo de solicitação. */
export async function saveServiceType(id: string | null, name: string): Promise<ActionResult<{ id: string }>> {
  const user = await manageAccess();
  if (!user) return fail(NO_PERMISSION);
  const parsed = serviceTypeNameSchema.safeParse(name);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Informe o nome do tipo.");

  const duplicate = await prisma.serviceType.findFirst({
    where: { tenantId: user.tenantId, name: { equals: parsed.data, mode: "insensitive" }, ...(id ? { id: { not: id } } : {}) },
    select: { id: true },
  });
  if (duplicate) return fail("Já existe um tipo com esse nome.");

  let savedId = id;
  if (id) {
    const found = await prisma.serviceType.updateMany({ where: { id, tenantId: user.tenantId }, data: { name: parsed.data } });
    if (found.count === 0) return fail("Tipo não encontrado. Atualize a página.");
  } else {
    const created = await prisma.serviceType.create({ data: { tenantId: user.tenantId, name: parsed.data }, select: { id: true } });
    savedId = created.id;
  }

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: id ? "service_type.update" : "service_type.create",
    entityType: "service_type",
    entityId: savedId!,
    description: `Tipo de solicitação "${parsed.data}" ${id ? "renomeado" : "criado"}.`,
  });
  refresh();
  return { ok: true, id: savedId! };
}

/** Ativa ou desativa o tipo (desativado some das listas de escolha, mas as tarefas antigas continuam com ele). */
export async function setServiceTypeActive(id: string, active: boolean): Promise<ActionResult> {
  const user = await manageAccess();
  if (!user) return fail(NO_PERMISSION);
  const result = await prisma.serviceType.updateMany({ where: { id, tenantId: user.tenantId }, data: { active } });
  if (result.count === 0) return fail("Tipo não encontrado. Atualize a página.");
  refresh();
  return { ok: true };
}

/** Exclui o tipo — só se nenhuma tarefa ou pedido do portal usar. Senão, desative. */
export async function deleteServiceType(id: string): Promise<ActionResult> {
  const user = await manageAccess();
  if (!user) return fail(NO_PERMISSION);
  const type = await prisma.serviceType.findFirst({ where: { id, tenantId: user.tenantId }, select: { id: true, name: true } });
  if (!type) return fail("Tipo não encontrado. Atualize a página.");

  const [tasks, requests] = await Promise.all([
    prisma.process.count({ where: { OR: [{ serviceTypeId: id }, { serviceTypeTags: { some: { serviceTypeId: id } } }] } }),
    prisma.portalRequest.count({ where: { serviceTypeId: id } }),
  ]);
  if (tasks + requests > 0) {
    const uso = [tasks > 0 ? `${tasks} tarefa(s)` : null, requests > 0 ? `${requests} pedido(s) do portal` : null].filter(Boolean).join(" e ");
    return fail(`Este tipo está em uso (${uso}) e não pode ser excluído. Clique em Desativar: ele some das listas de escolha e as tarefas antigas continuam com ele.`);
  }

  try {
    await prisma.serviceType.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") return fail("Este tipo ainda está em uso. Desative-o em vez de excluir.");
    throw err;
  }
  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "service_type.delete",
    entityType: "service_type",
    entityId: id,
    description: `Tipo de solicitação "${type.name}" excluído.`,
  });
  refresh();
  return { ok: true };
}
