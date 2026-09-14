"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/validations/document-upload";
import { documentTemplateSchema } from "@/lib/validations/document-template";

const BUCKET = "documents";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Configuração de tenant (mesmo nível de Workflow/Regra) — só TENANT_ADMIN,
// não OPERATOR.
async function requireAdminAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN");
}

export async function uploadTemplate(formData: FormData) {
  const user = await requireAdminAccess();

  const data = documentTemplateSchema.parse({
    name: String(formData.get("name") || ""),
    category: String(formData.get("category") || ""),
    description: String(formData.get("description") || "") || undefined,
  });

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Selecione um arquivo .docx.");
  if (file.type !== DOCX_MIME) throw new Error("O modelo precisa ser um arquivo .docx (Word).");
  if (file.size === 0) throw new Error("Selecione um arquivo.");
  if (file.size > MAX_UPLOAD_SIZE_BYTES) throw new Error("Arquivo maior que 20MB.");

  const template = await prisma.documentTemplate.create({
    data: {
      tenantId: user.tenantId!,
      name: data.name,
      category: data.category,
      description: data.description || null,
      storagePath: "",
    },
  });

  const path = `${user.tenantId}/templates/${template.id}.docx`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(BUCKET).upload(path, file, { contentType: DOCX_MIME });
  if (error) {
    await prisma.documentTemplate.delete({ where: { id: template.id } });
    throw new Error(`Falha ao enviar arquivo: ${error.message}`);
  }

  await prisma.documentTemplate.update({ where: { id: template.id }, data: { storagePath: path } });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "document_template.create",
    entityType: "document_template",
    entityId: template.id,
    description: `Modelo de documento "${template.name}" cadastrado.`,
  });

  revalidatePath("/modelos");
}

export async function deleteTemplate(templateId: string) {
  const user = await requireAdminAccess();

  const template = await prisma.documentTemplate.findFirst({
    where: { id: templateId, tenantId: user.tenantId! },
  });
  if (!template) throw new Error("Modelo não encontrado.");

  const admin = createSupabaseAdminClient();
  await admin.storage.from(BUCKET).remove([template.storagePath]);

  await prisma.documentTemplate.delete({ where: { id: templateId } });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "document_template.delete",
    entityType: "document_template",
    entityId: templateId,
    description: `Modelo de documento "${template.name}" removido.`,
  });

  revalidatePath("/modelos");
}
