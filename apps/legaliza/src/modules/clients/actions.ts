"use server";

import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { clientSchema, type ClientInput } from "@/lib/validations/client";

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

export async function createClient(input: ClientInput) {
  const user = await requireWriteAccess();
  const data = clientSchema.parse(input);

  let client;
  try {
    client = await prisma.client.create({
      data: {
        tenantId: user.tenantId!,
        name: data.name,
        fantasyName: data.fantasyName || null,
        type: data.type,
        doc: data.doc.replace(/\D/g, ""),
        email: data.email,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        status: data.status,
      },
    });
  } catch (err) {
    rethrowFriendly(err, "Já existe um cliente cadastrado com este CPF/CNPJ.");
  }

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "client.create",
    entityType: "client",
    entityId: client.id,
    description: `Cliente "${client.name}" cadastrado.`,
  });

  revalidatePath("/clientes");
  return { id: client.id };
}

export async function updateClient(clientId: string, input: ClientInput) {
  const user = await requireWriteAccess();
  const data = clientSchema.parse(input);

  let result;
  try {
    result = await prisma.client.updateMany({
      where: { id: clientId, tenantId: user.tenantId! },
      data: {
        name: data.name,
        fantasyName: data.fantasyName || null,
        type: data.type,
        doc: data.doc.replace(/\D/g, ""),
        email: data.email,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        status: data.status,
      },
    });
  } catch (err) {
    rethrowFriendly(err, "Já existe um cliente cadastrado com este CPF/CNPJ.");
  }

  if (result.count === 0) throw new Error("Cliente não encontrado.");

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "client.update",
    entityType: "client",
    entityId: clientId,
    description: `Cliente "${data.name}" atualizado.`,
  });

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/clientes");
}
