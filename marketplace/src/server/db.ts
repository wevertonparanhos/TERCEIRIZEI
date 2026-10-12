import "server-only";
import { PrismaClient } from "@prisma/client";

declare global {
  var __prisma: PrismaClient | undefined;
}

/** Prisma conecta como `postgres` (ignora RLS): a autorização é feita em src/server/auth.ts. */
export const db = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalThis.__prisma = db;
