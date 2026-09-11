"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateUploadedFile, sanitizeFileName } from "@/lib/validations/document-upload";
import { documentRequestSchema, type DocumentRequestInput } from "@/lib/validations/document-request";

const BUCKET = "documents";

async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

export async function requestDocument(processId: string, input: DocumentRequestInput) {
  const user = await requireWriteAccess();
  const data = documentRequestSchema.parse(input);

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId! } });
  if (!process) throw new Error("Processo não encontrado.");

  const request = await prisma.documentRequest.create({
    data: {
      tenantId: user.tenantId!,
      clientId: process.clientId,
      processId,
      label: data.label,
      deadline: data.deadline ? new Date(data.deadline) : null,
      notes: data.notes || null,
      requestedById: user.id,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "document_request.create",
    entityType: "process",
    entityId: processId,
    description: `Documento solicitado ao cliente: "${request.label}".`,
  });

  revalidatePath(`/processos/${processId}`);
}

export async function cancelDocumentRequest(processId: string, requestId: string) {
  const user = await requireWriteAccess();

  const result = await prisma.documentRequest.updateMany({
    where: { id: requestId, processId, tenantId: user.tenantId! },
    data: { status: "CANCELADO" },
  });
  if (result.count === 0) throw new Error("Solicitação não encontrada.");

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "document_request.cancel",
    entityType: "process",
    entityId: processId,
    description: "Solicitação de documento cancelada.",
  });

  revalidatePath(`/processos/${processId}`);
}

// Cliente envia o arquivo pedido — cria o Document (mesmo GED de sempre) e
// marca a solicitação como RECEBIDO, já linkada ao documento enviado.
export async function respondDocumentRequest(processId: string, requestId: string, formData: FormData) {
  const user = await requireRole("CLIENT");
  if (!user.clientId) throw new Error("Acesso negado.");

  const request = await prisma.documentRequest.findFirst({
    where: { id: requestId, processId, clientId: user.clientId },
  });
  if (!request) throw new Error("Solicitação não encontrada.");

  const process = await prisma.process.findFirst({ where: { id: processId, clientId: user.clientId } });
  if (!process) throw new Error("Processo não encontrado.");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Selecione um arquivo.");
  validateUploadedFile(file);

  const document = await prisma.document.create({
    data: {
      tenantId: process.tenantId,
      clientId: user.clientId,
      processId,
      category: "OUTROS",
      name: request.label,
      uploadedById: user.id,
    },
  });

  const path = `${process.tenantId}/${user.clientId}/${document.id}/v1-${sanitizeFileName(file.name)}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    await prisma.document.delete({ where: { id: document.id } });
    throw new Error(`Falha ao enviar arquivo: ${error.message}`);
  }

  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      storagePath: path,
      fileName: file.name,
      sizeBytes: file.size,
      mimeType: file.type,
      uploadedById: user.id,
    },
  });

  await prisma.documentRequest.update({
    where: { id: requestId },
    data: { status: "RECEBIDO", documentId: document.id },
  });

  await logAudit({
    tenantId: process.tenantId,
    userId: user.id,
    action: "document_request.respond",
    entityType: "process",
    entityId: processId,
    description: `Cliente enviou o documento pedido: "${request.label}".`,
  });

  revalidatePath(`/portal/processos/${processId}`);
  revalidatePath(`/processos/${processId}`);
}
