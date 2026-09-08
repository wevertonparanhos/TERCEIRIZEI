"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { complianceItemSchema, type ComplianceItemInput } from "@/lib/validations/compliance";

async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

async function requireOwnCompany(user: CurrentUser, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId: user.tenantId! },
    select: { id: true },
  });
  if (!company) throw new Error("Empresa não encontrada.");
}

// Certidões negativas, alvarás e certificados digitais — controle de
// vencimento por empresa (seção 26, "Manual Assistido" formalizado na Fase 9
// + Fase 10). Registro manual: sem busca automática nos portais oficiais
// (exigiria automação de navegador + guardar certificado digital, ambos
// fora de escopo — ver plano da Fase 10).
export async function createComplianceItem(companyId: string, input: ComplianceItemInput) {
  const user = await requireWriteAccess();
  await requireOwnCompany(user, companyId);
  const data = complianceItemSchema.parse(input);

  const item = await prisma.complianceItem.create({
    data: {
      tenantId: user.tenantId!,
      companyId,
      type: data.type,
      name: data.name,
      issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      documentId: data.documentId || null,
      notes: data.notes || null,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "compliance_item.create",
    entityType: "company",
    entityId: companyId,
    description: `Item de compliance "${item.name}" registrado.`,
  });

  revalidatePath(`/empresas/${companyId}`);
}

// Renovação: o operador atualiza a validade quando emite uma certidão nova
// (ou renova alvará/certificado) em vez de apagar e recriar o item.
export async function updateComplianceItemExpiry(companyId: string, itemId: string, expiresAt: string) {
  const user = await requireWriteAccess();
  await requireOwnCompany(user, companyId);

  const result = await prisma.complianceItem.updateMany({
    where: { id: itemId, companyId, tenantId: user.tenantId! },
    data: { expiresAt: expiresAt ? new Date(expiresAt) : null },
  });
  if (result.count === 0) throw new Error("Item de compliance não encontrado.");

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "compliance_item.renew",
    entityType: "company",
    entityId: companyId,
    description: `Validade de item de compliance atualizada.`,
  });

  revalidatePath(`/empresas/${companyId}`);
}

export async function deleteComplianceItem(companyId: string, itemId: string) {
  const user = await requireWriteAccess();
  await requireOwnCompany(user, companyId);

  await prisma.complianceItem.delete({ where: { id: itemId, companyId } });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "compliance_item.remove",
    entityType: "company",
    entityId: companyId,
    description: "Item de compliance removido.",
  });

  revalidatePath(`/empresas/${companyId}`);
}
