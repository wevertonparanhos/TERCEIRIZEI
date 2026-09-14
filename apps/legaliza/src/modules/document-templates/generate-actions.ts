"use server";

import { revalidatePath } from "next/cache";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sanitizeFileName } from "@/lib/validations/document-upload";
import { buildTemplateData } from "./template-filler";

const BUCKET = "documents";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

export async function generateDocumentFromTemplate(processId: string, templateId: string) {
  const user = await requireWriteAccess();

  const [process, template] = await Promise.all([
    prisma.process.findFirst({
      where: { id: processId, tenantId: user.tenantId! },
      include: {
        client: { select: { name: true, doc: true, email: true } },
        company: {
          select: {
            legalName: true,
            tradeName: true,
            cnpj: true,
            legalNature: true,
            capital: true,
            partners: { orderBy: { createdAt: "asc" } },
            addresses: { take: 1 },
          },
        },
      },
    }),
    prisma.documentTemplate.findFirst({ where: { id: templateId, tenantId: user.tenantId! } }),
  ]);
  if (!process) throw new Error("Processo não encontrado.");
  if (!template) throw new Error("Modelo não encontrado.");

  const partner = process.company?.partners.find((p) => p.administrator) ?? process.company?.partners[0] ?? null;
  const address = process.company?.addresses[0] ?? null;

  const templateData = buildTemplateData({
    client: process.client,
    company: process.company
      ? {
          legalName: process.company.legalName,
          tradeName: process.company.tradeName,
          cnpj: process.company.cnpj,
          legalNature: process.company.legalNature,
          capital: process.company.capital ? Number(process.company.capital) : null,
        }
      : null,
    partner: partner ? { name: partner.name, cpf: partner.cpf, qualification: partner.qualification } : null,
    address: address
      ? {
          street: address.street,
          number: address.number,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          cep: address.cep,
        }
      : null,
    process: { type: process.type, state: process.state, municipality: process.municipality },
  });

  const admin = createSupabaseAdminClient();
  const { data: templateFile, error: downloadError } = await admin.storage.from(BUCKET).download(template.storagePath);
  if (downloadError || !templateFile) {
    throw new Error(`Não foi possível baixar o modelo: ${downloadError?.message ?? "arquivo não encontrado"}`);
  }

  const templateBuffer = await templateFile.arrayBuffer();

  let outputBuffer: Buffer;
  try {
    const zip = new PizZip(templateBuffer);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(templateData);
    outputBuffer = doc.getZip().generate({ type: "nodebuffer" });
  } catch (err) {
    console.error("Falha ao renderizar template docxtemplater:", err);
    throw new Error(
      "Não foi possível preencher o modelo — confira se as variáveis no .docx estão escritas certas (ex: {cliente_nome})."
    );
  }

  const name = `${template.name} — ${process.company?.legalName ?? process.client.name}`;
  const document = await prisma.document.create({
    data: {
      tenantId: user.tenantId!,
      clientId: process.clientId,
      processId,
      category: template.category,
      name,
      uploadedById: user.id,
    },
  });

  const fileName = `${sanitizeFileName(template.name)}.docx`;
  const path = `${user.tenantId}/${process.clientId}/${document.id}/v1-${fileName}`;
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, outputBuffer, { contentType: DOCX_MIME });
  if (uploadError) {
    await prisma.document.delete({ where: { id: document.id } });
    throw new Error(`Falha ao salvar documento gerado: ${uploadError.message}`);
  }

  await prisma.documentVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      storagePath: path,
      fileName,
      sizeBytes: outputBuffer.byteLength,
      mimeType: DOCX_MIME,
      uploadedById: user.id,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "document.generate_from_template",
    entityType: "process",
    entityId: processId,
    description: `Documento "${name}" gerado a partir do modelo "${template.name}".`,
  });

  revalidatePath(`/processos/${processId}`);
  return { id: document.id };
}
