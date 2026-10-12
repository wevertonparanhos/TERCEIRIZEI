import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, Lock, MapPin, Phone } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { HoldCountdown } from "@/components/hold-countdown";
import { Stars } from "@/components/reviews/stars";
import { LinkButton } from "@/components/ui/button";
import { Badge, Card, Notice } from "@/components/ui/surface";
import { formatLocalTime } from "@/domain/availability";
import { canSeeCounterpartyContact, STATUS_LABEL } from "@/domain/booking-state";
import { formatBps, formatBRL } from "@/domain/money";
import { formatDateTime, formatMinutes } from "@/lib/utils";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { expireStaleHolds } from "@/server/scheduling";
import { cancelUnpaidBookingAction } from "../../actions";

const longDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });

export default async function CustomerBookingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  const { id } = await params;
  const { novo } = await searchParams;
  const user = await requirePageRole(["CUSTOMER"], `/conta/pedidos/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await expireStaleHolds();

  // Pedido de outra pessoa → 404 (nunca revela que existe).
  const b = await db.booking.findFirst({
    where: { id, customerId: user.id },
    include: {
      service: { select: { name: true, slug: true } },
      provider: { select: { id: true, displayName: true, phone: true, whatsapp: true } },
      address: true,
      items: true,
      review: { select: { rating: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!b) notFound();

  const contactVisible = canSeeCounterpartyContact(b.status, b.contactReleasedAt);
  const awaiting = b.status === "AWAITING_PAYMENT" && b.holdExpiresAt && b.holdExpiresAt > new Date();
  const awaitingProvider = b.status === "AWAITING_PROVIDER";
  const snapshot = b.snapshot as { durationMinutes?: number };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/conta" className="text-sm font-medium text-brand hover:underline">← Meus pedidos</Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{b.service.name}</h1>
          <p className="text-sm text-muted">Pedido {b.code}</p>
        </div>
        <Badge tone={["CANCELLED", "EXPIRED", "DECLINED"].includes(b.status) ? "neutral" : "brand"} className="px-3 py-1 text-sm">{STATUS_LABEL[b.status]}</Badge>
      </div>

      {novo && awaitingProvider ? (
        <div className="mt-6">
          <Notice title="Solicitação enviada!">O horário fica segurado enquanto {b.provider?.displayName.split(" ")[0]} confirma. Nada é cobrado até o aceite.</Notice>
        </div>
      ) : null}

      {awaitingProvider ? (
        <Card className="mt-6 p-5">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <Clock className="size-5 text-brand" aria-hidden /> Aguardando o aceite de {b.provider?.displayName.split(" ")[0]}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            O profissional tem até {b.providerResponseDeadline ? formatDateTime(b.providerResponseDeadline) : "o prazo"} para responder. Depois do aceite,
            você recebe um prazo para pagar. Se ele não responder, a solicitação expira sem nenhuma cobrança.
          </p>
          <ActionForm action={cancelUnpaidBookingAction} submitLabel="Cancelar solicitação" variant="secondary" confirm="Cancelar esta solicitação?" className="mt-4">
            <input type="hidden" name="bookingId" value={b.id} />
          </ActionForm>
        </Card>
      ) : null}

      {b.status === "DECLINED" ? (
        <div className="mt-6">
          <Notice tone="warning" title="O profissional não pôde aceitar">
            {b.declineReason ? `Motivo: ${b.declineReason}. ` : ""}Nada foi cobrado.{" "}
            <Link href={`/contratar/${b.service.slug}`} className="font-semibold underline">Escolher outro profissional ou horário</Link>
          </Notice>
        </div>
      ) : null}

      {awaiting ? (
        <Card className="mt-6 border-highlight/50 bg-highlight-soft/40 p-5">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            <Clock className="size-5 text-warning" aria-hidden /> Pedido aceito! Pague em até <HoldCountdown expiresAt={b.holdExpiresAt!.toISOString()} />
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            O pagamento online (PIX e cartão) chega na próxima etapa da plataforma. Por enquanto, o prazo expira sozinho e o horário volta a
            ficar livre — nenhuma cobrança é feita.
          </p>
          <ActionForm action={cancelUnpaidBookingAction} submitLabel="Cancelar pedido" variant="secondary" confirm="Cancelar este pedido e liberar o horário?" className="mt-4">
            <input type="hidden" name="bookingId" value={b.id} />
          </ActionForm>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="space-y-3 p-5 text-sm">
          <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 size-4 text-muted" aria-hidden /><span className="capitalize">{longDate.format(b.scheduledStart)}</span></p>
          <p className="flex items-start gap-2"><Clock className="mt-0.5 size-4 text-muted" aria-hidden />{formatLocalTime(b.scheduledStart)} – {formatLocalTime(b.scheduledEnd)}{snapshot.durationMinutes ? ` (${formatMinutes(snapshot.durationMinutes)})` : ""}</p>
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 text-muted" aria-hidden />{b.address.street}, {b.address.number}{b.address.complement ? ` – ${b.address.complement}` : ""} · {b.address.neighborhood} · {b.address.city}/{b.address.state}</p>
        </Card>

        <Card className="p-5 text-sm">
          <p className="text-muted">Profissional</p>
          <Link href={`/profissionais/${b.provider?.id}`} className="font-semibold hover:text-brand">{b.provider?.displayName}</Link>
          {contactVisible && b.provider?.phone ? (
            <p className="mt-3 flex items-center gap-2"><Phone className="size-4 text-muted" aria-hidden />{b.provider.phone}{b.provider.whatsapp ? ` · WhatsApp ${b.provider.whatsapp}` : ""}</p>
          ) : (
            <p className="mt-3 flex items-start gap-2 text-muted"><Lock className="mt-0.5 size-4" aria-hidden />O contato do profissional é liberado depois da confirmação do pagamento.</p>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="font-semibold">Valores</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {b.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3"><span className="text-ink-soft">{i.name}{i.quantity > 1 ? ` × ${i.quantity}` : ""}</span><span>{formatBRL(i.totalCents)}</span></li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Valor do profissional</dt><dd>{formatBRL(b.providerSubtotalCents)}</dd></div>
          {b.commissionMode === "ON_TOP" ? <div className="flex justify-between"><dt className="text-muted">Taxa de serviço ({formatBps(b.commissionRateBps)})</dt><dd>{formatBRL(b.commissionCents)}</dd></div> : null}
          {b.discountCents ? <div className="flex justify-between"><dt className="text-muted">Desconto</dt><dd>−{formatBRL(b.discountCents)}</dd></div> : null}
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Total</dt><dd>{formatBRL(b.totalCents)}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-muted">Valores congelados no momento da contratação; mudanças de preço posteriores não afetam este pedido.</p>
      </Card>

      {b.status === "COMPLETED" ? (
        <Card className="mt-6 flex items-center justify-between gap-3 p-5">
          {b.review ? (
            <><span className="text-sm">Sua avaliação</span><Stars value={b.review.rating} /></>
          ) : (
            <><span className="text-sm font-medium">Como foi o serviço?</span><LinkButton href={`/conta/pedidos/${b.id}/avaliar`} size="sm">Avaliar</LinkButton></>
          )}
        </Card>
      ) : null}

      <Card className="mt-6 p-5">
        <h2 className="font-semibold">Histórico</h2>
        <ol className="mt-3 space-y-3 border-l border-line pl-4 text-sm">
          {b.statusHistory.map((h) => (
            <li key={h.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand" aria-hidden />
              <p className="font-medium">{STATUS_LABEL[h.toStatus]}</p>
              <p className="text-xs text-muted">{formatDateTime(h.createdAt)}{h.reason ? ` · ${h.reason}` : ""}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
