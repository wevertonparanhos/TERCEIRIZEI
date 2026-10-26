import { NextResponse } from "next/server";
import { prisma } from "@terceirizei/db";
import { checkBackupToken, listBackupTables } from "@/lib/backup-auth";

export const dynamic = "force-dynamic";

/** Lista as tabelas e a contagem de linhas — o Apps Script do Drive usa isto
 * para saber o que buscar e para conferir que o backup veio completo. */
export async function GET(request: Request) {
  const denied = checkBackupToken(request);
  if (denied) return denied;

  const tables = await listBackupTables(prisma);
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const rows = await prisma.$queryRawUnsafe<{ n: bigint }[]>(`select count(*)::bigint as n from "public"."${table}"`);
    counts[table] = Number(rows[0].n);
  }
  return NextResponse.json({ generatedAt: new Date().toISOString(), tables, counts });
}
