import { PrismaClient } from "../generated/client";

declare global {
  // eslint-disable-next-line no-var
  var __legalizaPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__legalizaPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__legalizaPrisma = prisma;
}

export * from "../generated/client";
