"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";

const STAFF_ROLES = ["ADMIN", "GESTOR", "OPERACIONAL"];

/** Staff enviando mensagem para o chat geral de um cliente. */
export async function sendStaffMessage(clientId: string, body: string) {
  const user = await getCurrentUser();
  if (!user || !STAFF_ROLES.includes(user.role)) throw new Error("Você não tem acesso a este módulo.");
  if (!body.trim()) throw new Error("Escreva uma mensagem.");

  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: user.tenantId } });
  if (!client) throw new Error("Cliente não encontrado.");

  await prisma.clientMessage.create({ data: { tenantId: user.tenantId, clientId, authorId: user.id, body: body.trim() } });

  revalidatePath(`/chat/${clientId}`);
  revalidatePath("/chat");
  revalidatePath("/portal/chat");
}

/** Cliente enviando mensagem, pelo Portal. */
export async function sendClientMessage(body: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLIENTE" || !user.clientId) throw new Error("Acesso negado.");
  if (!body.trim()) throw new Error("Escreva uma mensagem.");

  await prisma.clientMessage.create({
    data: { tenantId: user.tenantId, clientId: user.clientId, authorId: user.id, body: body.trim() },
  });

  revalidatePath("/portal/chat");
  revalidatePath(`/chat/${user.clientId}`);
  revalidatePath("/chat");
}

/** Chamado ao abrir a tela do chat — marca como visto por esse usuário. */
export async function markMessagesRead(clientId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  if (user.role === "CLIENTE" && user.clientId !== clientId) return;
  if (user.role !== "CLIENTE" && !STAFF_ROLES.includes(user.role)) return;

  await prisma.clientMessageRead.upsert({
    where: { clientId_userId: { clientId, userId: user.id } },
    create: { clientId, userId: user.id, lastReadAt: new Date() },
    update: { lastReadAt: new Date() },
  });
}
