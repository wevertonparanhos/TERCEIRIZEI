import { NextResponse } from "next/server";
import { prisma } from "@terceirizei/db";
import { checkBackupToken, listBackupTables } from "@/lib/backup-auth";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 1000;

/** Devolve uma página de linhas de UMA tabela (nome validado contra a lista
 * real de tabelas — nunca interpolado direto da URL). Páginas pequenas evitam
 * estourar o limite de resposta da Vercel conforme a base cresce. */
export async function GET(request: Request) {
  const denied = checkBackupToken(request);
  if (denied) return denied;

  const url = new URL(request.url);
  const name = url.searchParams.get("name") ?? "";
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get("limit") ?? 500) || 500));

  const tables = await listBackupTables(prisma);
  if (!tables.includes(name)) {
    return NextResponse.json({ error: "Tabela inválida." }, { status: 400 });
  }

  const rows = await prisma.$queryRawUnsafe<{ row: unknown }[]>(
    `select to_jsonb(t) as row from (select * from "public"."${name}" order by 1 offset ${offset} limit ${limit}) t`
  );
  return NextResponse.json({ table: name, offset, limit, rows: rows.map((r) => r.row) });
}
