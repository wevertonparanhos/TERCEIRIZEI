import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Notificação interna (sininho). E-mail/WhatsApp entram como canais extras
 * quando houver provedor configurado — nunca simulamos envio sem credencial.
 */
export async function notify(
  tx: Prisma.TransactionClient,
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  await tx.notification.create({ data: { userId, type, title, body, link: link ?? null, channel: "IN_APP" } });
}

export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}
