import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** Protege as rotas de exportação do backup com um token longo (BACKUP_TOKEN)
 * enviado em "Authorization: Bearer ...". Sem o token configurado, as rotas
 * ficam fechadas (503) — nunca abertas. */
export function checkBackupToken(request: Request): NextResponse | null {
  const expected = process.env.BACKUP_TOKEN;
  if (!expected || expected.length < 32) {
    return NextResponse.json({ error: "Backup não configurado." }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  return null;
}

export async function listBackupTables(prisma: { $queryRawUnsafe: <T>(q: string) => Promise<T> }): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name"
  );
  return rows.map((r) => r.table_name);
}
