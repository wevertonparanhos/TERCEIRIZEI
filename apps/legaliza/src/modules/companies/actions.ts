"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { companySchema, type CompanyInput } from "@/lib/validations/company";
import { partnerSchema, type PartnerInput } from "@/lib/validations/partner";
import { activitySchema, type ActivityInput } from "@/lib/validations/activity";
import { addressSchema, type AddressInput } from "@/lib/validations/address";
import { toDecimalOrNull } from "@/lib/decimal";

// A conexão do Prisma usa a role postgres do Supabase (bypassa RLS) — tenant_id
// explícito em todo where/data abaixo é a real fronteira de isolamento nesta
// camada, não a RLS (mesmo padrão documentado no Terceirizei OS).
async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

function rethrowFriendly(err: unknown, duplicateMessage: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new Error(duplicateMessage);
  }
  throw err;
}

async function requireOwnClient(user: CurrentUser, clientId: string) {
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: user.tenantId! },
    select: { id: true },
  });
  if (!client) throw new Error("Cliente não encontrado.");
}

async function requireOwnCompany(user: CurrentUser, companyId: string) {
  const company = await prisma.company.findFirst({
    where: { id: companyId, tenantId: user.tenantId! },
    select: { id: true },
  });
  if (!company) throw new Error("Empresa não encontrada.");
}

// ---------- Company ----------

export async function createCompany(clientId: string, input: CompanyInput) {
  const user = await requireWriteAccess();
  await requireOwnClient(user, clientId);
  const data = companySchema.parse(input);

  let company;
  try {
    company = await prisma.company.create({
      data: {
        tenantId: user.tenantId!,
        clientId,
        cnpj: data.cnpj.replace(/\D/g, ""),
        legalName: data.legalName,
        tradeName: data.tradeName || null,
        legalNature: data.legalNature || null,
        companySize: data.companySize || null,
        capital: toDecimalOrNull(data.capital),
        stateRegistration: data.stateRegistration || null,
        municipalRegistration: data.municipalRegistration || null,
        businessPurpose: data.businessPurpose || null,
        status: data.status,
      },
    });
  } catch (err) {
    rethrowFriendly(err, "Já existe uma empresa cadastrada com este CNPJ.");
  }

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "company.create",
    entityType: "company",
    entityId: company.id,
    description: `Empresa "${company.legalName}" cadastrada.`,
  });

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/empresas");
  return { id: company.id };
}

export async function updateCompany(companyId: string, input: CompanyInput) {
  const user = await requireWriteAccess();
  const data = companySchema.parse(input);

  let result;
  try {
    result = await prisma.company.updateMany({
      where: { id: companyId, tenantId: user.tenantId! },
      data: {
        cnpj: data.cnpj.replace(/\D/g, ""),
        legalName: data.legalName,
        tradeName: data.tradeName || null,
        legalNature: data.legalNature || null,
        companySize: data.companySize || null,
        capital: toDecimalOrNull(data.capital),
        stateRegistration: data.stateRegistration || null,
        municipalRegistration: data.municipalRegistration || null,
        businessPurpose: data.businessPurpose || null,
        status: data.status,
      },
    });
  } catch (err) {
    rethrowFriendly(err, "Já existe uma empresa cadastrada com este CNPJ.");
  }

  if (result.count === 0) throw new Error("Empresa não encontrada.");

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "company.update",
    entityType: "company",
    entityId: companyId,
    description: `Empresa "${data.legalName}" atualizada.`,
  });

  revalidatePath(`/empresas/${companyId}`);
  revalidatePath("/empresas");
}

// ---------- Partner ----------

export async function assertParticipationFits(companyId: string, newPercentage: number, excludePartnerId?: string) {
  const partners = await prisma.partner.findMany({
    where: { companyId, ...(excludePartnerId ? { id: { not: excludePartnerId } } : {}) },
    select: { participationPercentage: true },
  });
  const currentTotal = partners.reduce((sum, p) => sum + Number(p.participationPercentage), 0);
  const total = currentTotal + newPercentage;
  if (total > 100) {
    throw new Error(
      `Participação ultrapassa 100%: já há ${currentTotal.toFixed(2)}% alocado, + ${newPercentage.toFixed(2)}% = ${total.toFixed(2)}%.`
    );
  }
}

export async function addPartner(companyId: string, input: PartnerInput) {
  const user = await requireWriteAccess();
  await requireOwnCompany(user, companyId);
  const data = partnerSchema.parse(input);

  await assertParticipationFits(companyId, data.participationPercentage);

  const partner = await prisma.partner.create({
    data: {
      companyId,
      name: data.name,
      cpf: data.cpf.replace(/\D/g, ""),
      qualification: data.qualification,
      participationPercentage: data.participationPercentage,
      capitalContribution: toDecimalOrNull(data.capitalContribution),
      administrator: data.administrator,
      email: data.email || null,
      phone: data.phone || null,
    },
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "partner.add",
    entityType: "company",
    entityId: companyId,
    description: `Sócio "${partner.name}" (${data.participationPercentage}%) adicionado.`,
  });

  revalidatePath(`/empresas/${companyId}`);
}

export async function deletePartner(companyId: string, partnerId: string) {
  const user = await requireWriteAccess();
  await requireOwnCompany(user, companyId);

  await prisma.partner.delete({ where: { id: partnerId, companyId } });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "partner.remove",
    entityType: "company",
    entityId: companyId,
    description: "Sócio removido.",
  });

  revalidatePath(`/empresas/${companyId}`);
}

// ---------- CompanyActivity (CNAE) ----------

export async function addActivity(companyId: string, input: ActivityInput) {
  const user = await requireWriteAccess();
  await requireOwnCompany(user, companyId);
  const data = activitySchema.parse(input);

  const existingCount = await prisma.companyActivity.count({ where: { companyId } });
  const isPrimary = existingCount === 0 ? true : data.isPrimary;

  await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.companyActivity.updateMany({ where: { companyId }, data: { isPrimary: false } });
    }
    await tx.companyActivity.create({
      data: { companyId, cnae: data.cnae, description: data.description, isPrimary },
    });
  });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "activity.add",
    entityType: "company",
    entityId: companyId,
    description: `CNAE "${data.cnae}" adicionado.`,
  });

  revalidatePath(`/empresas/${companyId}`);
}

export async function setPrimaryActivity(companyId: string, activityId: string) {
  const user = await requireWriteAccess();
  await requireOwnCompany(user, companyId);

  await prisma.$transaction([
    prisma.companyActivity.updateMany({ where: { companyId }, data: { isPrimary: false } }),
    prisma.companyActivity.update({ where: { id: activityId }, data: { isPrimary: true } }),
  ]);

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "activity.set_primary",
    entityType: "company",
    entityId: companyId,
    description: "CNAE principal alterado.",
  });

  revalidatePath(`/empresas/${companyId}`);
}

export async function deleteActivity(companyId: string, activityId: string) {
  const user = await requireWriteAccess();
  await requireOwnCompany(user, companyId);

  await prisma.companyActivity.delete({ where: { id: activityId, companyId } });

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "activity.remove",
    entityType: "company",
    entityId: companyId,
    description: "CNAE removido.",
  });

  revalidatePath(`/empresas/${companyId}`);
}

// ---------- CompanyAddress ----------

export async function saveAddress(companyId: string, input: AddressInput) {
  const user = await requireWriteAccess();
  await requireOwnCompany(user, companyId);
  const data = addressSchema.parse(input);

  const existing = await prisma.companyAddress.findFirst({ where: { companyId } });

  const values = {
    cep: data.cep.replace(/\D/g, ""),
    street: data.street,
    number: data.number,
    complement: data.complement || null,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state.toUpperCase(),
  };

  if (existing) {
    await prisma.companyAddress.update({ where: { id: existing.id }, data: values });
  } else {
    await prisma.companyAddress.create({ data: { companyId, ...values } });
  }

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "address.save",
    entityType: "company",
    entityId: companyId,
    description: `Endereço salvo (${values.city}/${values.state}).`,
  });

  revalidatePath(`/empresas/${companyId}`);
}
