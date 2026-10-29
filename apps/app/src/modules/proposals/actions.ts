"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { Prisma, prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { todayBRT } from "@/modules/finance/ledger";
import { emptyContent, parseContent, proposalToContent } from "@/modules/proposals/content";
import { ensureMandatoryClauses } from "@/modules/proposals/contract-clauses";
import {
  proposalContentSchema,
  proposalResponseSchema,
  type ProposalContent,
  type ProposalResponseInput,
} from "@/lib/validations/proposal";

// A conexão do Prisma bypassa RLS (role postgres) — tenant_id explícito em todo
// where/data abaixo é a real fronteira de isolamento nesta camada.
async function requireManageAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR"].includes(user.role)) {
    throw new Error("Você não tem permissão para gerenciar propostas.");
  }
  return user;
}

async function nextProposalNumber(tenantId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    insert into tenant_counters (tenant_id, key, value)
    values (${tenantId}::uuid, 'proposal', 1)
    on conflict (tenant_id, key) do update set value = tenant_counters.value + 1
    returning value
  `;
  return rows[0].value;
}

async function assertClient(clientId: string | null | undefined, tenantId: string) {
  if (!clientId) return null;
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true, name: true } });
  if (!client) throw new Error("Cliente não encontrado.");
  return client;
}

/** Colunas da proposta que vêm do conteúdo do editor (tudo menos os itens). */
function contentColumns(c: ProposalContent) {
  return {
    title: c.title,
    intro: c.intro.trim() || null,
    notes: c.notes.trim() || null,
    paymentMethods: c.paymentMethods,
    dueBusinessDay: c.dueBusinessDay,
    lateFeePercent: c.lateFeePercent,
    lateInterestPercent: c.lateInterestPercent,
    noticeDays: c.noticeDays,
    termMonths: c.termMonths,
    foro: c.foro,
    validDays: c.validDays,
    coverUrl: c.coverUrl || null,
    hideClientContact: c.hideClientContact,
    // As cláusulas obrigatórias nunca saem: o servidor recoloca as que faltarem.
    clauses: ensureMandatoryClauses(c.clauses) as unknown as Prisma.InputJsonValue,
    extraSections: c.extraSections as unknown as Prisma.InputJsonValue,
  };
}

function itemRows(proposalId: string, c: ProposalContent) {
  return c.items.map((item, position) => ({
    proposalId,
    description: item.description,
    detail: item.detail.trim() || null,
    unit: item.unit.trim() || null,
    value: item.value,
    position,
  }));
}

/** Cria o rascunho: em branco ou copiando um modelo. O cliente é opcional até enviar. */
export async function createProposal(input: { title: string; clientId?: string; templateId?: string }) {
  const user = await requireManageAccess();
  const title = input.title.trim();
  if (title.length < 3) throw new Error("Dê um nome para a proposta.");
  const client = await assertClient(input.clientId || null, user.tenantId);

  let content = emptyContent(title);
  if (input.templateId) {
    const template = await prisma.proposalTemplate.findFirst({ where: { id: input.templateId, tenantId: user.tenantId } });
    if (!template) throw new Error("Modelo não encontrado.");
    content = { ...parseContent(template.data, title), title };
  }

  const number = await nextProposalNumber(user.tenantId);
  const proposal = await prisma.$transaction(async (tx) => {
    const created = await tx.proposal.create({
      data: { tenantId: user.tenantId, number, clientId: client?.id ?? null, createdById: user.id, ...contentColumns(content) },
    });
    if (content.items.length > 0) await tx.proposalItem.createMany({ data: itemRows(created.id, content) });
    return created;
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "proposal.create",
    entityType: "proposal",
    entityId: proposal.id,
    description: `Proposta #${number} "${title}" criada${client ? ` para ${client.name}` : ""}.`,
  });

  revalidatePath("/propostas");
  return proposal.id;
}

async function requireDraftProposal(proposalId: string, tenantId: string) {
  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, tenantId } });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status !== "RASCUNHO") throw new Error("Só é possível editar propostas em rascunho. Volte a proposta para rascunho para editar.");
  return proposal;
}

export async function saveProposal(proposalId: string, input: { clientId: string | null; content: ProposalContent }) {
  const user = await requireManageAccess();
  const content = proposalContentSchema.parse(input.content);
  await requireDraftProposal(proposalId, user.tenantId);
  const client = await assertClient(input.clientId, user.tenantId);

  await prisma.$transaction(async (tx) => {
    await tx.proposal.update({ where: { id: proposalId }, data: { clientId: client?.id ?? null, ...contentColumns(content) } });
    await tx.proposalItem.deleteMany({ where: { proposalId } });
    if (content.items.length > 0) await tx.proposalItem.createMany({ data: itemRows(proposalId, content) });
  });

  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/propostas");
}

export async function sendProposal(proposalId: string) {
  const user = await requireManageAccess();

  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, tenantId: user.tenantId },
    include: { items: true },
  });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status !== "RASCUNHO") throw new Error("Essa proposta já foi enviada.");
  if (!proposal.clientId) throw new Error("Escolha o cliente da proposta antes de enviar.");
  if (proposal.items.length === 0) throw new Error("Adicione ao menos um serviço antes de enviar.");

  // Validade vale até o fim do último dia (data sem hora, em UTC, como o resto do sistema).
  const validUntil = new Date(todayBRT().getTime() + proposal.validDays * 86400000 + 86399000);
  await prisma.proposal.update({ where: { id: proposalId }, data: { status: "ENVIADA", sentAt: new Date(), validUntil } });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "proposal.send",
    entityType: "proposal",
    entityId: proposalId,
    description: `Proposta #${proposal.number} "${proposal.title}" enviada ao cliente.`,
  });

  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/propostas");
}

/** Cancela uma proposta já enviada (ou aceita): some do portal, mas fica no histórico. */
export async function cancelProposal(proposalId: string, reason?: string) {
  const user = await requireManageAccess();
  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, tenantId: user.tenantId } });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status !== "ENVIADA" && proposal.status !== "ACEITA") throw new Error("Só dá para cancelar propostas enviadas ou aceitas.");

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "CANCELADA", canceledAt: new Date(), cancelReason: reason?.trim() || null },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "proposal.cancel",
    entityType: "proposal",
    entityId: proposalId,
    description: `Proposta #${proposal.number} "${proposal.title}" cancelada${reason?.trim() ? `: ${reason.trim()}` : "."}`,
  });

  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/propostas");
  revalidatePath("/portal/propostas");
}

/** Volta uma proposta enviada/cancelada/recusada para rascunho, para editar de novo. */
export async function reopenProposal(proposalId: string) {
  const user = await requireManageAccess();
  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, tenantId: user.tenantId } });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status === "RASCUNHO") return;
  if (proposal.status === "ACEITA") throw new Error("Proposta aceita não volta para rascunho. Cancele ou crie uma nova.");

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: "RASCUNHO", sentAt: null, respondedAt: null, responseNote: null, canceledAt: null, cancelReason: null, validUntil: null },
  });

  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/propostas");
  revalidatePath("/portal/propostas");
}

/** Exclui de vez (qualquer situação). A confirmação é feita na tela. */
export async function deleteProposal(proposalId: string) {
  const user = await requireManageAccess();
  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, tenantId: user.tenantId } });
  if (!proposal) throw new Error("Proposta não encontrada.");

  await prisma.proposal.delete({ where: { id: proposalId } });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "proposal.delete",
    entityType: "proposal",
    entityId: proposalId,
    description: `Proposta #${proposal.number} "${proposal.title}" excluída (estava ${proposal.status}).`,
  });

  revalidatePath("/propostas");
  revalidatePath("/portal/propostas");
}

// ---------- Modelos ----------

export async function createTemplate(name: string) {
  const user = await requireManageAccess();
  const clean = name.trim();
  if (clean.length < 2) throw new Error("Dê um nome para o modelo.");
  const template = await prisma.proposalTemplate.create({
    data: { tenantId: user.tenantId, name: clean, data: emptyContent(clean) as unknown as Prisma.InputJsonValue, createdById: user.id },
  });
  revalidatePath("/propostas");
  return template.id;
}

export async function saveTemplate(templateId: string, input: { name: string; content: ProposalContent }) {
  const user = await requireManageAccess();
  const name = input.name.trim();
  if (name.length < 2) throw new Error("Dê um nome para o modelo.");
  const content = proposalContentSchema.parse(input.content);
  const template = await prisma.proposalTemplate.findFirst({ where: { id: templateId, tenantId: user.tenantId } });
  if (!template) throw new Error("Modelo não encontrado.");

  await prisma.proposalTemplate.update({ where: { id: templateId }, data: { name, data: content as unknown as Prisma.InputJsonValue } });
  revalidatePath("/propostas");
  revalidatePath(`/propostas/modelos/${templateId}`);
}

export async function deleteTemplate(templateId: string) {
  const user = await requireManageAccess();
  const template = await prisma.proposalTemplate.findFirst({ where: { id: templateId, tenantId: user.tenantId } });
  if (!template) throw new Error("Modelo não encontrado.");
  await prisma.proposalTemplate.delete({ where: { id: templateId } });
  revalidatePath("/propostas");
}

/** Guarda o conteúdo atual da proposta como um novo modelo. */
export async function saveProposalAsTemplate(proposalId: string, name: string) {
  const user = await requireManageAccess();
  const clean = name.trim();
  if (clean.length < 2) throw new Error("Dê um nome para o modelo.");
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, tenantId: user.tenantId },
    include: { items: { orderBy: { position: "asc" } } },
  });
  if (!proposal) throw new Error("Proposta não encontrada.");

  const template = await prisma.proposalTemplate.create({
    data: {
      tenantId: user.tenantId,
      name: clean,
      data: proposalToContent(proposal) as unknown as Prisma.InputJsonValue,
      createdById: user.id,
    },
  });
  revalidatePath("/propostas");
  return template.id;
}

// ---------- Blocos de texto ----------

export async function createProposalBlock(name: string, body: string) {
  const user = await requireManageAccess();
  const cleanName = name.trim();
  const cleanBody = body.trim();
  if (cleanName.length < 2) throw new Error("Dê um nome para o bloco.");
  if (!cleanBody) throw new Error("O bloco está vazio.");
  const block = await prisma.proposalBlock.create({ data: { tenantId: user.tenantId, name: cleanName, body: cleanBody } });
  return { id: block.id, name: block.name, body: block.body };
}

export async function deleteProposalBlock(blockId: string) {
  const user = await requireManageAccess();
  const block = await prisma.proposalBlock.findFirst({ where: { id: blockId, tenantId: user.tenantId } });
  if (!block) throw new Error("Bloco não encontrado.");
  await prisma.proposalBlock.delete({ where: { id: blockId } });
}

// ---------- Portal do cliente ----------

/** Cliente aceitando ou recusando, pelo Portal. */
export async function clientRespondProposal(proposalId: string, accept: boolean, input: ProposalResponseInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENTE" || !user.clientId) throw new Error("Acesso negado.");
  const data = proposalResponseSchema.parse(input);

  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, clientId: user.clientId } });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status !== "ENVIADA") throw new Error("Essa proposta já foi respondida.");

  const newStatus = accept ? "ACEITA" : "RECUSADA";

  const forwarded = headers().get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : headers().get("x-real-ip");

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      status: newStatus,
      respondedAt: new Date(),
      responseNote: data.responseNote || null,
      ...(accept ? { acceptedByName: user.name, acceptedIp: ip || null } : {}),
    },
  });

  await logAudit({
    tenantId: proposal.tenantId,
    userId: user.id,
    action: `proposal.${accept ? "accept" : "reject"}`,
    entityType: "proposal",
    entityId: proposalId,
    description: `Proposta #${proposal.number} "${proposal.title}" ${accept ? "aceita" : "recusada"} pelo cliente.`,
  });

  revalidatePath(`/portal/propostas/${proposalId}`);
  revalidatePath("/portal/propostas");
  revalidatePath(`/propostas/${proposalId}`);
}
