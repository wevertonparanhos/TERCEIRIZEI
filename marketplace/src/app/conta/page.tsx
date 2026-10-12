import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { Stars } from "@/components/reviews/stars";
import { Badge, Card, EmptyState, Notice, PageHeader } from "@/components/ui/surface";
import { STATUS_LABEL } from "@/domain/booking-state";
import { formatBRL } from "@/domain/money";
import { formatDateTime } from "@/lib/utils";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";

export default async function CustomerHome({ searchParams }: { searchParams: Promise<{ avaliado?: string }> }) {
  const { avaliado } = await searchParams;
  const user = await requirePageRole(["CUSTOMER"], "/conta");
  const bookings = await db.booking.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      code: true,
      status: true,
      scheduledStart: true,
      totalCents: true,
      service: { select: { name: true } },
      review: { select: { rating: true } },
    },
  });

  return (
    <>
      <PageHeader
        title={`Olá, ${user.name.split(" ")[0]}`}
        description="Acompanhe seus pedidos e contrate novos serviços."
        actions={<LinkButton href="/servicos">Contratar serviço</LinkButton>}
      />

      {avaliado ? (
        <div className="mb-6">
          <Notice title="Obrigado pela avaliação!">Ela já aparece no perfil do profissional e ajuda outros clientes.</Notice>
        </div>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold">Meus pedidos</h2>
      {bookings.length === 0 ? (
        <EmptyState
          title="Você ainda não tem pedidos"
          description="Escolha um serviço, compare os preços dos profissionais e agende."
          action={<LinkButton href="/servicos" variant="secondary">Ver serviços</LinkButton>}
        />
      ) : (
        <Card className="divide-y divide-line">
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
              <div>
                <p className="font-semibold">{b.service.name}</p>
                <p className="text-muted">{b.code} · {formatDateTime(b.scheduledStart)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="brand">{STATUS_LABEL[b.status]}</Badge>
                {b.review ? (
                  <Stars value={b.review.rating} size="sm" />
                ) : b.status === "COMPLETED" ? (
                  <LinkButton href={`/conta/pedidos/${b.id}/avaliar`} size="sm">Avaliar</LinkButton>
                ) : null}
                <span className="font-semibold">{formatBRL(b.totalCents)}</span>
              </div>
            </div>
          ))}
        </Card>
      )}

      <p className="mt-8 text-sm text-muted">
        Precisa atualizar telefone ou nome? <Link href="/conta/perfil" className="font-medium text-brand hover:underline">Editar meus dados</Link>
      </p>
    </>
  );
}
