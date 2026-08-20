"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@terceirizei/db";
import { getCurrentUser, type CurrentUser } from "@/lib/rbac";
import {
  clientSchema,
  clientContactSchema,
  companySchema,
  type ClientInput,
  type ClientContactInput,
  type CompanyInput,
} from "@/lib/validations/client";

// A conexão do Prisma usa a role postgres (bypassa RLS) — o tenant_id explícito em
// todo where/data abaixo é a real fronteira de isolamento nesta camada, não a RLS.
async function requireWriteAccess(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "GESTOR"].includes(user.role)) {
    throw new Error("Você não tem permissão para esta ação.");
  }
  return user;
}

/** Traduz violação de unique constraint (P2002) em mensagem amigável; relança o resto. */
function rethrowFriendly(err: unknown, duplicateMessage: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new Error(duplicateMessage);
  }
  throw err;
}

export async function createClient(input: ClientInput) {
  const user = await requireWriteAccess();
  const data = clientSchema.parse(input);

  let client;
  try {
    client = await prisma.client.create({
      data: {
        tenantId: user.tenantId,
        name: data.name,
        fantasyName: data.fantasyName || null,
        type: data.type,
        doc: data.doc.replace(/\D/g, ""),
        email: data.email,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        address: data.address || null,
        zipCode: data.zipCode || null,
        city: data.city || null,
        state: data.state || null,
        notes: data.notes || null,
        status: data.status,
        ownerUserId: data.ownerUserId || null,
      },
    });
  } catch (err) {
    rethrowFriendly(err, "Já existe um cliente cadastrado com este CPF/CNPJ ou e-mail.");
  }

  revalidatePath("/clientes");
  return { id: client.id };
}

export async function updateClient(clientId: string, input: ClientInput) {
  const user = await requireWriteAccess();
  const data = clientSchema.parse(input);

  let result;
  try {
    result = await prisma.client.updateMany({
      where: { id: clientId, tenantId: user.tenantId },
      data: {
        name: data.name,
        fantasyName: data.fantasyName || null,
        type: data.type,
        doc: data.doc.replace(/\D/g, ""),
        email: data.email,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        address: data.address || null,
        zipCode: data.zipCode || null,
        city: data.city || null,
        state: data.state || null,
        notes: data.notes || null,
        status: data.status,
        ownerUserId: data.ownerUserId || null,
      },
    });
  } catch (err) {
    rethrowFriendly(err, "Já existe um cliente cadastrado com este CPF/CNPJ ou e-mail.");
  }

  if (result.count === 0) throw new Error("Cliente não encontrado.");

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
}

export async function addClientContact(clientId: string, input: ClientContactInput) {
  const user = await requireWriteAccess();
  const data = clientContactSchema.parse(input);

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!client) throw new Error("Cliente não encontrado.");

  await prisma.clientContact.create({
    data: {
      clientId,
      name: data.name,
      role: data.role,
      email: data.email || null,
      phone: data.phone || null,
    },
  });

  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteClientContact(clientId: string, contactId: string) {
  const user = await requireWriteAccess();

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!client) throw new Error("Cliente não encontrado.");

  await prisma.clientContact.delete({ where: { id: contactId, clientId } });
  revalidatePath(`/clientes/${clientId}`);
}

export async function addCompany(clientId: string, input: CompanyInput) {
  const user = await requireWriteAccess();
  const data = companySchema.parse(input);

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!client) throw new Error("Cliente não encontrado.");

  try {
    await prisma.company.create({
      data: {
        tenantId: user.tenantId,
        clientId,
        cnpj: data.cnpj.replace(/\D/g, ""),
        razaoSocial: data.razaoSocial,
        nomeFantasia: data.nomeFantasia || null,
        inscricaoEstadual: data.inscricaoEstadual || null,
        inscricaoMunicipal: data.inscricaoMunicipal || null,
        cnae: data.cnae || null,
        naturezaJuridica: data.naturezaJuridica || null,
        regimeTributario: data.regimeTributario || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        openedAt: data.openedAt ? new Date(data.openedAt) : null,
        status: data.status,
        notes: data.notes || null,
      },
    });
  } catch (err) {
    rethrowFriendly(err, "Já existe uma empresa cadastrada com este CNPJ.");
  }

  revalidatePath(`/clientes/${clientId}`);
}

export async function deleteCompany(clientId: string, companyId: string) {
  const user = await requireWriteAccess();

  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId: user.tenantId },
    select: { id: true },
  });
  if (!client) throw new Error("Cliente não encontrado.");

  await prisma.company.delete({ where: { id: companyId, clientId } });
  revalidatePath(`/clientes/${clientId}`);
}
