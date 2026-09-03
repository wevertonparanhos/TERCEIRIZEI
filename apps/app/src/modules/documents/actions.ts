"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  documentUploadSchema,
  documentRequestSchema,
  MAX_UPLOAD_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  type DocumentRequestInput,
} from "@/lib/validations/document-upload";

const BUCKET = "documents";

// A conexão do Prisma bypassa RLS (role postgres) — tenant_id/client_id explícitos
// em todo where/data abaixo são a real fronteira de isolamento nesta camada.
// Documentos não têm o FINANCEIRO na matriz de permissões (só ADMIN/GESTOR/OPERACIONAL).
async function requireStaff(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) {
    throw new Error("Você não tem acesso a este módulo.");
  }
  return user;
}

async function requireOwnClient(): Promise<CurrentUser & { clientId: string }> {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENTE" || !user.clientId) {
    throw new Error("Acesso negado.");
  }
  return { ...user, clientId: user.clientId };
}

async function assertClientInTenant(clientId: string, tenantId: string) {
  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId }, select: { id: true } });
  if (!client) throw new Error("Cliente não encontrado.");
}

function sanitizeFileName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.\-]/g, "_");
}

function validateFile(file: File) {
  if (file.size === 0) throw new Error("Selecione um arquivo.");
  if (file.size > MAX_UPLOAD_SIZE_BYTES) throw new Error("Arquivo maior que 20MB.");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Tipo de arquivo não permitido. Envie PDF, imagem, Word ou Excel.");
  }
}

async function performUpload(params: {
  tenantId: string;
  clientId: string;
  processId: string | null;
  requestId: string | null;
  uploaderId: string;
  formData: FormData;
}) {
  const { tenantId, clientId, processId, requestId, uploaderId, formData } = params;

  const data = documentUploadSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
  });
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Selecione um arquivo.");
  validateFile(file);

  const document = await prisma.document.create({
    data: { tenantId, clientId, processId, category: data.category, name: data.name, uploadedById: uploaderId },
  });

  const path = `${tenantId}/${clientId}/${document.id}/v1-${sanitizeFileName(file.name)}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(`Falha ao enviar arquivo: ${error.message}`);

  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      storagePath: path,
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      uploadedById: uploaderId,
    },
  });

  if (requestId) {
    await prisma.documentRequest.updateMany({
      where: { id: requestId, tenantId, clientId },
      data: { status: "RECEBIDO", documentId: document.id },
    });
  }

  await logAudit({
    tenantId,
    userId: uploaderId,
    action: "document.upload",
    entityType: "document",
    entityId: document.id,
    description: `Documento "${data.name}" enviado.`,
  });

  if (processId) revalidatePath(`/processos/${processId}`);
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/portal/processos");
  revalidatePath("/portal/documentos");
}

async function performNewVersion(params: { document: NonNullable<Awaited<ReturnType<typeof prisma.document.findFirst>>>; uploaderId: string; formData: FormData }) {
  const { document, uploaderId, formData } = params;

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Selecione um arquivo.");
  validateFile(file);

  const nextVersion = document.currentVersion + 1;
  const path = `${document.tenantId}/${document.clientId}/${document.id}/v${nextVersion}-${sanitizeFileName(file.name)}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw new Error(`Falha ao enviar arquivo: ${error.message}`);

  await prisma.$transaction([
    prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version: nextVersion,
        storagePath: path,
        fileName: file.name,
        sizeBytes: file.size,
        mimeType: file.type,
        uploadedById: uploaderId,
      },
    }),
    // uma nova versão invalida qualquer aprovação anterior — o conteúdo mudou,
    // precisa de nova solicitação se o staff quiser aprovação do cliente de novo.
    prisma.document.update({
      where: { id: document.id },
      data: { currentVersion: nextVersion, approvalStatus: null, approvalNote: null },
    }),
  ]);

  await logAudit({
    tenantId: document.tenantId,
    userId: uploaderId,
    action: "document.new_version",
    entityType: "document",
    entityId: document.id,
    description: `Nova versão (v${nextVersion}) do documento "${document.name}" enviada.`,
  });

  if (document.processId) revalidatePath(`/processos/${document.processId}`);
  revalidatePath(`/clientes/${document.clientId}`);
  revalidatePath("/portal/processos");
  revalidatePath("/portal/documentos");
}

export async function uploadNewDocument(
  clientId: string,
  processId: string | null,
  requestId: string | null,
  formData: FormData
) {
  const user = await requireStaff();
  await assertClientInTenant(clientId, user.tenantId);
  await performUpload({ tenantId: user.tenantId, clientId, processId, requestId, uploaderId: user.id, formData });
}

export async function uploadNewVersion(documentId: string, formData: FormData) {
  const user = await requireStaff();
  const document = await prisma.document.findFirst({ where: { id: documentId, tenantId: user.tenantId } });
  if (!document) throw new Error("Documento não encontrado.");
  await performNewVersion({ document, uploaderId: user.id, formData });
}

/** Cliente enviando documento pelo Portal — só pode agir sobre os próprios dados. */
export async function clientUploadDocument(
  clientId: string,
  processId: string | null,
  requestId: string | null,
  formData: FormData
) {
  const user = await requireOwnClient();
  if (clientId !== user.clientId) throw new Error("Acesso negado.");
  if (processId) {
    const process = await prisma.process.findFirst({ where: { id: processId, clientId: user.clientId } });
    if (!process) throw new Error("Processo não encontrado.");
  }
  await performUpload({ tenantId: user.tenantId, clientId, processId, requestId, uploaderId: user.id, formData });
}

export async function clientUploadNewVersion(documentId: string, formData: FormData) {
  const user = await requireOwnClient();
  const document = await prisma.document.findFirst({ where: { id: documentId, clientId: user.clientId } });
  if (!document) throw new Error("Documento não encontrado.");
  await performNewVersion({ document, uploaderId: user.id, formData });
}

export async function requestDocument(clientId: string, processId: string | null, input: DocumentRequestInput) {
  const user = await requireStaff();
  await assertClientInTenant(clientId, user.tenantId);
  const data = documentRequestSchema.parse(input);

  const request = await prisma.documentRequest.create({
    data: {
      tenantId: user.tenantId,
      clientId,
      processId: processId || null,
      label: data.label,
      deadline: data.deadline ? new Date(data.deadline) : null,
      notes: data.notes || null,
      requestedById: user.id,
    },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "document_request.create",
    entityType: "document_request",
    entityId: request.id,
    description: `Documento "${data.label}" solicitado ao cliente.`,
  });

  if (processId) revalidatePath(`/processos/${processId}`);
  revalidatePath(`/clientes/${clientId}`);
}

export async function markRequestReceived(requestId: string) {
  const user = await requireStaff();
  const result = await prisma.documentRequest.updateMany({
    where: { id: requestId, tenantId: user.tenantId },
    data: { status: "RECEBIDO" },
  });
  if (result.count === 0) throw new Error("Solicitação não encontrada.");

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "document_request.mark_received",
    entityType: "document_request",
    entityId: requestId,
    description: "Solicitação de documento marcada como recebida.",
  });

  revalidatePath("/processos");
  revalidatePath("/clientes");
}

/** Staff solicita a aprovação do cliente pra um documento já enviado — ex.:
 * entregável final na etapa de conclusão. Puramente informativo, não trava
 * mudança de etapa. */
export async function requestDocumentApproval(documentId: string) {
  const user = await requireStaff();
  const document = await prisma.document.findFirst({ where: { id: documentId, tenantId: user.tenantId } });
  if (!document) throw new Error("Documento não encontrado.");

  await prisma.document.update({
    where: { id: documentId },
    data: { approvalStatus: "PENDENTE", approvalNote: null },
  });

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "document.request_approval",
    entityType: "document",
    entityId: documentId,
    description: `Aprovação do cliente solicitada para o documento "${document.name}".`,
  });

  if (document.processId) revalidatePath(`/processos/${document.processId}`);
  revalidatePath(`/clientes/${document.clientId}`);
  if (document.processId) revalidatePath(`/portal/processos/${document.processId}`);
}

/** Cliente aprova ou recusa um documento pelo Portal — só o próprio, e só
 * enquanto estiver PENDENTE (evita responder duas vezes). */
export async function respondDocumentApproval(documentId: string, approved: boolean, note: string) {
  const user = await requireOwnClient();
  const document = await prisma.document.findFirst({ where: { id: documentId, clientId: user.clientId } });
  if (!document) throw new Error("Documento não encontrado.");
  if (document.approvalStatus !== "PENDENTE") {
    throw new Error("Este documento não está aguardando aprovação.");
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { approvalStatus: approved ? "APROVADO" : "RECUSADO", approvalNote: note.trim() || null },
  });

  await logAudit({
    tenantId: document.tenantId,
    userId: user.id,
    action: approved ? "document.approve" : "document.reject",
    entityType: "document",
    entityId: documentId,
    description: `Documento "${document.name}" ${approved ? "aprovado" : "recusado"} pelo cliente.`,
  });

  if (document.processId) {
    revalidatePath(`/processos/${document.processId}`);
    revalidatePath(`/portal/processos/${document.processId}`);
  }
  revalidatePath(`/clientes/${document.clientId}`);
}

export async function cancelRequest(requestId: string) {
  const user = await requireStaff();
  const result = await prisma.documentRequest.updateMany({
    where: { id: requestId, tenantId: user.tenantId },
    data: { status: "CANCELADO" },
  });
  if (result.count === 0) throw new Error("Solicitação não encontrada.");

  await logAudit({
    tenantId: user.tenantId,
    userId: user.id,
    action: "document_request.cancel",
    entityType: "document_request",
    entityId: requestId,
    description: "Solicitação de documento cancelada.",
  });

  revalidatePath("/processos");
  revalidatePath("/clientes");
}
