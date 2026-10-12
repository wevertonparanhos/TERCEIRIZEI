import { NextResponse } from "next/server";
import { can } from "@/domain/permissions";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";

/** Relatório financeiro por pedido pago (CSV, separador ";" para abrir direto no Excel em pt-BR). */
export async function GET() {
  const user = await getSessionUser();
  if (!user || !can(user.role, "admin:reports:export")) return new NextResponse("Acesso negado", { status: 403 });

  const rows = await db.booking.findMany({
    where: { payments: { some: { status: { in: ["APPROVED", "PARTIALLY_REFUNDED", "REFUNDED"] } } } },
    orderBy: { confirmedAt: "desc" },
    take: 10_000,
    include: { service: { select: { name: true } }, provider: { select: { displayName: true } }, payout: true, commission: true },
  });

  const money = (c: number | null | undefined) => ((c ?? 0) / 100).toFixed(2).replace(".", ",");
  const esc = (v: string) => `"${v.replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`; // evita injeção de fórmula
  const header = ["pedido", "confirmado_em", "servico", "profissional", "status", "valor_profissional", "comissao", "total_pago", "reembolsado", "comissao_estornada", "repasse_liquido", "status_repasse"];
  const lines = rows.map((b) =>
    [
      esc(b.code),
      esc(b.confirmedAt?.toISOString() ?? ""),
      esc(b.service.name),
      esc(b.provider?.displayName ?? ""),
      esc(b.status),
      money(b.providerSubtotalCents),
      money(b.commissionCents),
      money(b.totalCents),
      money(b.refundedCents),
      b.commission?.reversedAt ? "sim" : "nao",
      money(b.payout?.netCents),
      esc(b.payout?.status ?? ""),
    ].join(";"),
  );
  const csv = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="financeiro-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}
