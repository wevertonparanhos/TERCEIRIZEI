"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";

const NOTE_ROLES = ["ADMIN", "GESTOR", "OPERACIONAL"];

async function requireAccess() {
  const user = await getCurrentUser();
  if (!user || !NOTE_ROLES.includes(user.role)) throw new Error("Você não tem acesso a este módulo.");
  return user;
}

export async function addClientNote(clientId: string, body: string) {
  const user = await requireAccess();
  if (!body.trim()) throw new Error("Escreva uma anotação.");

  const client = await prisma.client.findFirst({ where: { id: clientId, tenantId: user.tenantId } });
  if (!client) throw new Error("Cliente não encontrado.");

  await prisma.clientNote.create({ data: { tenantId: user.tenantId, clientId, authorId: user.id, body: body.trim() } });

  revalidatePath(`/clientes/${clientId}`);
}

export async function toggleClientNotePinned(noteId: string, pinned: boolean) {
  const user = await requireAccess();

  const note = await prisma.clientNote.findFirst({ where: { id: noteId, tenantId: user.tenantId } });
  if (!note) throw new Error("Anotação não encontrada.");

  await prisma.clientNote.update({ where: { id: noteId }, data: { pinned } });

  revalidatePath(`/clientes/${note.clientId}`);
}

export async function deleteClientNote(noteId: string) {
  const user = await requireAccess();

  const note = await prisma.clientNote.findFirst({ where: { id: noteId, tenantId: user.tenantId } });
  if (!note) throw new Error("Anotação não encontrada.");
  if (note.authorId !== user.id && !["ADMIN", "GESTOR"].includes(user.role)) {
    throw new Error("Você só pode excluir suas próprias anotações.");
  }

  await prisma.clientNote.delete({ where: { id: noteId } });

  revalidatePath(`/clientes/${note.clientId}`);
}
