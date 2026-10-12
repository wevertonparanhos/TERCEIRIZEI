import Link from "next/link";
import { Card, Notice, PageHeader } from "@/components/ui/surface";
import { formatBps, formatBRL } from "@/domain/money";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";

function Stat({ label, value, href, hint }: { label: string; value: string | number; href?: string; hint?: string }) {
  const body = (
    <Card className="h-full p-5 transition hover:border-brand/40">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminDashboard() {
  await requirePagePermission("admin:dashboard:read", "/admin");

  const [customers, providersByStatus, publishedServices, offers, bookings, paid, globalRule, settings] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.providerProfile.groupBy({ by: ["status"], _count: true }),
    db.service.count({ where: { published: true, active: true } }),
    db.providerOffer.count({ where: { active: true } }),
    db.booking.count(),
    db.booking.aggregate({
      where: { status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETION_PENDING", "COMPLETED"] } },
      _sum: { totalCents: true, commissionCents: true },
    }),
    db.commissionRule.findFirst({ where: { scope: "GLOBAL", active: true } }),
    getSettings(),
  ]);

  const byStatus = Object.fromEntries(providersByStatus.map((p) => [p.status, p._count]));

  return (
    <>
      <PageHeader title="Painel" description="Visão geral da operação." />
      {(byStatus.PENDING ?? 0) > 0 ? (
        <div className="mb-6">
          <Notice title={`${byStatus.PENDING} profissional(is) aguardando análise`}>
            <Link href="/admin/profissionais?status=PENDING" className="font-semibold underline">Revisar cadastros</Link>
          </Notice>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clientes" value={customers} href="/admin/usuarios" />
        <Stat label="Profissionais aprovados" value={byStatus.APPROVED ?? 0} href="/admin/profissionais?status=APPROVED" hint={`${byStatus.PENDING ?? 0} em análise`} />
        <Stat label="Serviços publicados" value={publishedServices} href="/admin/servicos" hint={`${offers} preços ativos de profissionais`} />
        <Stat label="Pedidos" value={bookings} />
        <Stat label="Volume pago" value={formatBRL(paid._sum.totalCents ?? 0)} hint="Pedidos confirmados em diante" />
        <Stat label="Comissões" value={formatBRL(paid._sum.commissionCents ?? 0)} />
        <Stat
          label="Comissão global"
          value={globalRule ? formatBps(globalRule.rateBps) : "—"}
          href="/admin/comissoes"
          hint={settings.commissionMode === "ON_TOP" ? "Acrescida ao preço do profissional" : "Embutida no preço"}
        />
      </div>
    </>
  );
}
