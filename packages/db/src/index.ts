import { PrismaClient, Prisma } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();

globalThis.__prisma = prisma;

/** Refaz a consulta uma vez se a conexão pooled (Supavisor/PgBouncer) tiver caído
 * enquanto o cliente Prisma ficava ocioso entre requisições — falha rara e passageira
 * (a mesma consulta funciona normalmente na tentativa seguinte), não um erro de lógica. */
export async function withPrismaRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof Prisma.PrismaClientInitializationError) {
      return await fn();
    }
    throw err;
  }
}

export * from "@prisma/client";
