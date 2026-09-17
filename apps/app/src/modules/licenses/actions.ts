"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { licenseDocumentSchema, type LicenseDocumentInput } from "@/lib/validations/license";
import { isWithinReminderWindow } from "@/modules/licenses/labels";

// A conexão do Prisma bypassa RLS (role postgres) — tenant_id explícito em
// todo where/data abaixo é a real fronteira de isolamento nesta camada.
async function requireStaff(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  return user;
}

async function requireManageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR"].includes(user.role)) {
    throw new Error("Você não tem permissão para gerenciar licenças e certidões.");
  }
  return user;
}

export async function createLicenseDocument(input: LicenseDocumentInput) {
  const user = await requireManageAccess();
  const data = licenseDocumentSchema.parse(input);

  const client = await prisma.client.findFirst({ where: { id: data.clientId, tenantId: user.tenantId } });
  if (!client) throw new Error("Cliente não encontrado.");

  if (data.companyId) {
    const company = await prisma.company.findFirst({ where: { id: data.companyId, tenantId: user.tenantId } });
    if (!company) throw new Error("Empresa não encontrada.");
  }

  const license = await prisma.licenseDocument.create({
    data: {
      tenantId: user.tenantId,
      clientId: data.clientId,
      companyId: data.companyId || null,
      type: data.type,
      name: data.name,
      issuingBody: data.issuingBody || null,
      documentNumber: data.documentNumber || null,
      issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
      expiresAt: new Date(data.expiresAt),
      reminderDaysBefore: data.reminderDaysBefore,
      responsibleId: data.responsibleId || null,
      notes: data.notes || null,
      createdById: user.id,
    },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "license_document.create",
    entityType: "license_document",
    entityId: license.id,
    description: `Documento "${data.name}" (${client.name}) cadastrado, vence em ${new Date(data.expiresAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}.`,
  });

  revalidatePath("/licencas");
}

export async function deleteLicenseDocument(licenseId: string) {
  const user = await requireManageAccess();

  const result = await prisma.licenseDocument.deleteMany({ where: { id: licenseId, tenantId: user.tenantId } });
  if (result.count === 0) throw new Error("Documento não encontrado.");

  revalidatePath("/licencas");
}

async function nextProcessNumber(tenantId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    insert into tenant_counters (tenant_id, key, value)
    values (${tenantId}::uuid, 'process', 1)
    on conflict (tenant_id, key) do update set value = tenant_counters.value + 1
    returning value
  `;
  return rows[0].value;
}

/** Sem job/cron — na primeira leitura da lista de Licenças e Certidões depois
 * que um documento entra na janela de aviso, cria automaticamente uma Tarefa
 * de renovação (uma vez só, marcada via autoTaskId). Mesmo padrão "computado
 * a cada leitura" já usado por tarefas recorrentes e presença neste projeto. */
export async function ensureAutoRenewalTasks(tenantId: string): Promise<void> {
  const now = new Date();

  const candidates = await prisma.licenseDocument.findMany({
    where: { tenantId, autoTaskId: null },
    include: { client: { select: { name: true } } },
  });
  const due = candidates.filter((l) => isWithinReminderWindow(l.expiresAt, l.reminderDaysBefore, now));
  if (due.length === 0) return;

  const workspace = await prisma.workspace.findFirst({ where: { tenantId }, orderBy: { position: "asc" } });
  if (!workspace) return;
  const firstStage = await prisma.kanbanStage.findFirst({ where: { workspaceId: workspace.id }, orderBy: { position: "asc" } });
  if (!firstStage) return;

  const serviceType = await prisma.serviceType.upsert({
    where: { tenantId_name: { tenantId, name: "Renovação de Documento" } },
    create: { tenantId, name: "Renovação de Documento", defaultPriority: "ALTA" },
    update: {},
  });

  for (const license of due) {
    const number = await nextProcessNumber(tenantId);
    const process = await prisma.process.create({
      data: {
        tenantId,
        workspaceId: workspace.id,
        number,
        clientId: license.clientId,
        companyId: license.companyId,
        serviceTypeId: serviceType.id,
        stageId: firstStage.id,
        description: `Renovar: ${license.name} (${license.client.name}) — vence em ${license.expiresAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}.`,
        priority: "ALTA",
        dueAt: license.expiresAt,
        visibleInPortal: false,
      },
    });

    await prisma.processStage.create({
      data: { processId: process.id, fromStageId: null, toStageId: firstStage.id, userId: null },
    });

    if (license.responsibleId) {
      await prisma.processAssignee.create({ data: { processId: process.id, userId: license.responsibleId } });
    }

    await prisma.licenseDocument.update({ where: { id: license.id }, data: { autoTaskId: process.id } });

    await logAudit({
      tenantId,
      userId: license.createdById,
      action: "license_document.auto_task",
      entityType: "license_document",
      entityId: license.id,
      description: `Tarefa #${process.number} criada automaticamente para renovar "${license.name}".`,
    });
  }
  // Sem revalidatePath aqui: esta função roda durante a renderização da
  // página (não é uma mutação disparada pelo cliente), e as páginas deste
  // app já leem o Postgres direto a cada carregamento — sem cache pra invalidar.
}
