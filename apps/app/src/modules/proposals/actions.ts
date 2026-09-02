"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import {
  proposalSchema,
  proposalItemSchema,
  proposalResponseSchema,
  type ProposalInput,
  type ProposalItemInput,
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

export async function createProposal(input: ProposalInput) {
  const user = await requireManageAccess();
  const data = proposalSchema.parse(input);

  const client = await prisma.client.findFirst({ where: { id: data.clientId, tenantId: user.tenantId } });
  if (!client) throw new Error("Cliente não encontrado.");

  const number = await nextProposalNumber(user.tenantId);

  const proposal = await prisma.proposal.create({
    data: {
      tenantId: user.tenantId,
      number,
      clientId: data.clientId,
      title: data.title,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes || null,
      createdById: user.id,
    },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "proposal.create",
    entityType: "proposal",
    entityId: proposal.id,
    description: `Proposta #${number} "${data.title}" criada para ${client.name}.`,
  });

  revalidatePath("/propostas");
  return proposal.id;
}

async function requireDraftProposal(proposalId: string, tenantId: string) {
  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, tenantId } });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status !== "RASCUNHO") throw new Error("Só é possível editar propostas em rascunho.");
  return proposal;
}

export async function updateProposal(proposalId: string, input: ProposalInput) {
  const user = await requireManageAccess();
  const data = proposalSchema.parse(input);
  await requireDraftProposal(proposalId, user.tenantId);

  const client = await prisma.client.findFirst({ where: { id: data.clientId, tenantId: user.tenantId } });
  if (!client) throw new Error("Cliente não encontrado.");

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      clientId: data.clientId,
      title: data.title,
      validUntil: data.validUntil ? new Date(data.validUntil) : null,
      notes: data.notes || null,
    },
  });

  revalidatePath(`/propostas/${proposalId}`);
  revalidatePath("/propostas");
}

export async function addProposalItem(proposalId: string, input: ProposalItemInput) {
  const user = await requireManageAccess();
  const data = proposalItemSchema.parse(input);
  await requireDraftProposal(proposalId, user.tenantId);

  await prisma.proposalItem.create({ data: { proposalId, description: data.description, value: data.value } });

  revalidatePath(`/propostas/${proposalId}`);
}

export async function removeProposalItem(proposalId: string, itemId: string) {
  const user = await requireManageAccess();
  await requireDraftProposal(proposalId, user.tenantId);

  const item = await prisma.proposalItem.findFirst({ where: { id: itemId, proposalId } });
  if (!item) throw new Error("Item não encontrado.");

  await prisma.proposalItem.delete({ where: { id: itemId } });

  revalidatePath(`/propostas/${proposalId}`);
}

export async function sendProposal(proposalId: string) {
  const user = await requireManageAccess();

  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, tenantId: user.tenantId },
    include: { items: true },
  });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status !== "RASCUNHO") throw new Error("Essa proposta já foi enviada.");
  if (proposal.items.length === 0) throw new Error("Adicione ao menos um item antes de enviar.");

  await prisma.proposal.update({ where: { id: proposalId }, data: { status: "ENVIADA", sentAt: new Date() } });

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

export async function deleteProposal(proposalId: string) {
  const user = await requireManageAccess();
  await requireDraftProposal(proposalId, user.tenantId);

  await prisma.proposal.delete({ where: { id: proposalId } });

  revalidatePath("/propostas");
}

/** Cliente aceitando ou recusando, pelo Portal. */
export async function clientRespondProposal(proposalId: string, accept: boolean, input: ProposalResponseInput) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENTE" || !user.clientId) throw new Error("Acesso negado.");
  const data = proposalResponseSchema.parse(input);

  const proposal = await prisma.proposal.findFirst({ where: { id: proposalId, clientId: user.clientId } });
  if (!proposal) throw new Error("Proposta não encontrada.");
  if (proposal.status !== "ENVIADA") throw new Error("Essa proposta já foi respondida.");

  const newStatus = accept ? "ACEITA" : "RECUSADA";

  await prisma.proposal.update({
    where: { id: proposalId },
    data: { status: newStatus, respondedAt: new Date(), responseNote: data.responseNote || null },
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
