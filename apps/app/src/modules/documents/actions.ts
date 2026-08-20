"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
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

export async function uploadNewDocument(
  clientId: string,
  processId: string | null,
  requestId: string | null,
  formData: FormData
) {
  const user = await requireStaff();
  await assertClientInTenant(clientId, user.tenantId);

  const data = documentUploadSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
  });
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Selecione um arquivo.");
  validateFile(file);

  const document = await prisma.document.create({
    data: {
      tenantId: user.tenantId,
      clientId,
      processId: processId || null,
      category: data.category,
      name: data.name,
      uploadedById: user.id,
    },
  });

  const path = `${user.tenantId}/${clientId}/${document.id}/v1-${sanitizeFileName(file.name)}`;
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
      uploadedById: user.id,
    },
  });

  if (requestId) {
    await prisma.documentRequest.updateMany({
      where: { id: requestId, tenantId: user.tenantId },
      data: { status: "RECEBIDO", documentId: document.id },
    });
  }

  if (processId) revalidatePath(`/processos/${processId}`);
  revalidatePath(`/clientes/${clientId}`);
}

export async function uploadNewVersion(documentId: string, formData: FormData) {
  const user = await requireStaff();

  const document = await prisma.document.findFirst({ where: { id: documentId, tenantId: user.tenantId } });
  if (!document) throw new Error("Documento não encontrado.");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("Selecione um arquivo.");
  validateFile(file);

  const nextVersion = document.currentVersion + 1;
  const path = `${user.tenantId}/${document.clientId}/${document.id}/v${nextVersion}-${sanitizeFileName(file.name)}`;
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
        uploadedById: user.id,
      },
    }),
    prisma.document.update({ where: { id: document.id }, data: { currentVersion: nextVersion } }),
  ]);

  if (document.processId) revalidatePath(`/processos/${document.processId}`);
  revalidatePath(`/clientes/${document.clientId}`);
}

export async function requestDocument(clientId: string, processId: string | null, input: DocumentRequestInput) {
  const user = await requireStaff();
  await assertClientInTenant(clientId, user.tenantId);
  const data = documentRequestSchema.parse(input);

  await prisma.documentRequest.create({
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
  revalidatePath("/processos");
  revalidatePath("/clientes");
}

export async function cancelRequest(requestId: string) {
  const user = await requireStaff();
  const result = await prisma.documentRequest.updateMany({
    where: { id: requestId, tenantId: user.tenantId },
    data: { status: "CANCELADO" },
  });
  if (result.count === 0) throw new Error("Solicitação não encontrada.");
  revalidatePath("/processos");
  revalidatePath("/clientes");
}
