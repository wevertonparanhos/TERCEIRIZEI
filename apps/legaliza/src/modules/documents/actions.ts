"use server";

import { revalidatePath } from "next/cache";
import { prisma, type DocumentCategory } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { DOCUMENT_CATEGORIES, validateUploadedFile, sanitizeFileName } from "@/lib/validations/document-upload";

const BUCKET = "documents";

async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

function parseCategory(value: FormDataEntryValue | null): DocumentCategory {
  const category = DOCUMENT_CATEGORIES.find((c) => c === value);
  return category ?? "OUTROS";
}

export async function uploadDocument(processId: string, formData: FormData) {
  const user = await requireWriteAccess();

  const process = await prisma.process.findFirst({ where: { id: processId, tenantId: user.tenantId! } });
  if (!process) throw new Error("Processo não encontrado.");

  const name = String(formData.get("name") || "").trim();
  const file = formData.get("file");
  if (!name) throw new Error("Informe o nome do documento.");
  if (!(file instanceof File)) throw new Error("Selecione um arquivo.");
  validateUploadedFile(file);

  const document = await prisma.document.create({
    data: {
      tenantId: user.tenantId!,
      clientId: process.clientId,
      processId,
      category: parseCategory(formData.get("category")),
      name,
      uploadedById: user.id,
    },
  });

  const path = `${user.tenantId}/${process.clientId}/${document.id}/v1-${sanitizeFileName(file.name)}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    // Postgres e Storage não compartilham transação — desfaz o Document
    // manualmente pra não deixar um registro órfão sem nenhuma versão.
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

  revalidatePath(`/processos/${processId}`);
}

export async function uploadNewVersion(processId: string, documentId: string, formData: FormData) {
  const user = await requireWriteAccess();

  const document = await prisma.document.findFirst({ where: { id: documentId, processId, tenantId: user.tenantId! } });
  if (!document) throw new Error("Documento não encontrado.");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Selecione um arquivo.");
  validateUploadedFile(file);

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

  revalidatePath(`/processos/${processId}`);
}

export async function deleteDocument(processId: string, documentId: string) {
  const user = await requireWriteAccess();
  await prisma.document.deleteMany({ where: { id: documentId, processId, tenantId: user.tenantId! } });
  revalidatePath(`/processos/${processId}`);
}
