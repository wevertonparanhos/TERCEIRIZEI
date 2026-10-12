import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { Lock, MapPin, Phone } from "lucide-react";
import { ActionForm } from "@/components/action-form";
import { Input } from "@/components/ui/form";
import { Badge, Card, EmptyState, Notice, PageHeader } from "@/components/ui/surface";
import { formatLocalTime } from "@/domain/availability";
import { canSeeCounterpartyContact, STATUS_LABEL } from "@/domain/booking-state";
import { formatBRL } from "@/domain/money";
import { publicReviewerName } from "@/domain/reviews";
import { cn } from "@/lib/utils";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { expireStaleHolds } from "@/server/scheduling";
import { formatDateTime } from "@/lib/utils";
import { EVIDENCE_MAX_FILES } from "@/server/completion";
import { acceptBookingAction, declineBookingAction, finishServiceAction, providerCancelAction, startServiceAction, uploadEvidenceAction } from "../actions";

const day = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" });

const TABS = {
  proximos: { label: "Próximos", statuses: ["AWAITING_PROVIDER", "AWAITING_PAYMENT", "PAYMENT_PROCESSING", "CONFIRMED", "IN_PROGRESS", "COMPLETION_PENDING"] },
  historico: { label: "Histórico", statuses: ["COMPLETED", "CANCELLED", "DECLINED", "EXPIRED", "REFUND_PENDING", "REFUNDED", "DISPUTED"] },
} satisfies Record<string, { label: string; statuses: BookingStatus[] }>;

export default async function ProviderBookingsPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const user = await requirePageRole(["PROVIDER"], "/profissional/pedidos");
  const { aba } = await searchParams;
  const tab = aba === "historico" ? "historico" : "proximos";
  await expireStaleHolds();

  const provider = await db.providerProfile.findUniqueOrThrow({ where: { userId: user.id }, select: { id: true } });
  const bookings = await db.booking.findMany({
    where: { providerId: provider.id, status: { in: TABS[tab].statuses } },
    orderBy: { scheduledStart: tab === "proximos" ? "asc" : "desc" },
    take: 100,
    select: {
      id: true,
      code: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
      providerShareCents: true,
      contactReleasedAt: true,
      providerResponseDeadline: true,
      holdExpiresAt: true,
      declineReason: true,
      notes: true,
      propertyDetails: true,
      service: { select: { name: true } },
      items: { select: { name: true, quantity: true } },
      customer: { select: { name: true, phone: true } },
      address: { select: { street: true, number: true, complement: true, neighborhood: true, city: true, state: true, notes: true } },
      _count: { select: { evidence: true } },
    },
  });

  return (
    <>
      <PageHeader title="Pedidos" description="Seus atendimentos. Endereço completo e telefone do cliente aparecem após o pagamento confirmado." />
      <div className="mb-5 flex gap-2">
        {Object.entries(TABS).map(([key, t]) => (
          <Link
            key={key}
            href={`/profissional/pedidos?aba=${key}`}
            className={cn("rounded-full px-4 py-1.5 text-sm font-medium", key === tab ? "bg-ink text-white" : "bg-surface text-ink-soft ring-1 ring-line")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title={tab === "proximos" ? "Nenhum pedido agendado" : "Nenhum pedido no histórico"}
          description={tab === "proximos" ? "Mantenha agenda, regiões e preços atualizados para receber pedidos." : undefined}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            // Minimização de dados: só o necessário antes da liberação.
            const released = canSeeCounterpartyContact(b.status, b.contactReleasedAt);
            const details = (b.propertyDetails ?? {}) as { bedrooms?: number | null; bathrooms?: number | null; areaM2?: number | null; hasPets?: boolean };
            return (
              <Card key={b.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold capitalize">{day.format(b.scheduledStart).replace(".", "")} · {formatLocalTime(b.scheduledStart)}–{formatLocalTime(b.scheduledEnd)}</p>
                    <p className="text-sm text-muted">{b.service.name} · {b.code}</p>
                  </div>
                  <div className="text-right">
                    <Badge tone={b.status === "AWAITING_PROVIDER" ? "highlight" : b.status === "AWAITING_PAYMENT" ? "warning" : "brand"}>
                      {b.status === "AWAITING_PROVIDER" ? "Nova solicitação" : b.status === "AWAITING_PAYMENT" ? "Aguardando pagamento do cliente" : STATUS_LABEL[b.status]}
                    </Badge>
                    <p className="mt-1 text-sm">Você recebe <span className="font-bold">{formatBRL(b.providerShareCents)}</span></p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="font-medium">{released ? b.customer.name : publicReviewerName(b.customer.name)}</p>
                    {released ? (
                      <>
                        <p className="mt-1 flex items-start gap-2"><MapPin className="mt-0.5 size-4 text-muted" aria-hidden />{b.address.street}, {b.address.number}{b.address.complement ? ` – ${b.address.complement}` : ""} · {b.address.neighborhood} · {b.address.city}/{b.address.state}</p>
                        {b.customer.phone ? <p className="mt-1 flex items-center gap-2"><Phone className="size-4 text-muted" aria-hidden />{b.customer.phone}</p> : null}
                        {b.address.notes ? <p className="mt-1 text-muted">Acesso: {b.address.notes}</p> : null}
                      </>
                    ) : (
                      <>
                        <p className="mt-1 flex items-center gap-2 text-muted"><MapPin className="size-4" aria-hidden />{b.address.neighborhood} · {b.address.city}/{b.address.state}</p>
                        <p className="mt-1 flex items-start gap-2 text-xs text-muted"><Lock className="mt-0.5 size-3.5" aria-hidden />Endereço completo e telefone liberados após o pagamento.</p>
                      </>
                    )}
                  </div>
                  <div className="text-ink-soft">
                    <p>{b.items.map((i) => `${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`).join(" · ")}</p>
                    <p className="mt-1 text-muted">
                      {[details.bedrooms != null && `${details.bedrooms} quartos`, details.bathrooms != null && `${details.bathrooms} banheiros`, details.areaM2 && `${details.areaM2} m²`, details.hasPets && "tem animais"].filter(Boolean).join(" · ")}
                    </p>
                    {b.notes ? <p className="mt-1">“{b.notes}”</p> : null}
                  </div>
                </div>

                {b.status === "AWAITING_PROVIDER" ? (
                  <div className="mt-4 space-y-3 border-t border-line pt-4">
                    <Notice title={`Responda até ${b.providerResponseDeadline ? formatDateTime(b.providerResponseDeadline) : "o prazo"}`}>
                      Se você não responder, a solicitação expira e o horário é liberado. O cliente só paga depois do seu aceite.
                    </Notice>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                      <ActionForm action={acceptBookingAction} submitLabel="Aceitar pedido" pendingText="Aceitando…" className="space-y-2">
                        <input type="hidden" name="bookingId" value={b.id} />
                      </ActionForm>
                      <details className="flex-1">
                        <summary className="cursor-pointer py-2.5 text-sm font-semibold text-danger">Recusar</summary>
                        <ActionForm action={declineBookingAction} submitLabel="Confirmar recusa" variant="danger" confirm="Recusar esta solicitação?" className="mt-2">
                          <input type="hidden" name="bookingId" value={b.id} />
                          <Input name="reason" maxLength={300} placeholder="Motivo (o cliente verá). Ex.: não atendo esse bairro nesse dia." aria-label="Motivo da recusa" required />
                        </ActionForm>
                      </details>
                    </div>
                  </div>
                ) : null}
                {b.status === "AWAITING_PAYMENT" && b.holdExpiresAt ? (
                  <p className="mt-3 text-xs text-muted">Você aceitou. O cliente tem até {formatDateTime(b.holdExpiresAt)} para pagar.</p>
                ) : null}
                {b.status === "DECLINED" && b.declineReason ? <p className="mt-3 text-xs text-muted">Você recusou: {b.declineReason}</p> : null}

                {b.status === "CONFIRMED" ? (
                  <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-start">
                    <ActionForm action={startServiceAction} submitLabel="Iniciar atendimento" pendingText="Iniciando…">
                      <input type="hidden" name="bookingId" value={b.id} />
                    </ActionForm>
                    <details className="flex-1">
                      <summary className="cursor-pointer py-2.5 text-sm font-semibold text-danger">Não poderei atender</summary>
                      <ActionForm action={providerCancelAction} submitLabel="Cancelar e reembolsar o cliente" variant="danger" confirm="Cancelar este serviço? O cliente recebe reembolso integral." className="mt-2">
                        <input type="hidden" name="bookingId" value={b.id} />
                        <Input name="reason" maxLength={300} placeholder="Motivo (o cliente verá)" aria-label="Motivo do cancelamento" required />
                      </ActionForm>
                    </details>
                  </div>
                ) : null}

                {b.status === "IN_PROGRESS" ? (
                  <div className="mt-4 space-y-4 border-t border-line pt-4">
                    <Notice title="Para finalizar, envie fotos ou vídeos do serviço pronto">
                      O pagamento só é liberado depois das fotos/vídeos e/ou da confirmação do cliente. Até {EVIDENCE_MAX_FILES} arquivos de até 50 MB.
                    </Notice>
                    <ActionForm action={uploadEvidenceAction} submitLabel="Enviar arquivos" pendingText="Enviando…" variant="secondary">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input
                        type="file"
                        name="files"
                        multiple
                        accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm"
                        capture="environment"
                        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand-strong"
                        aria-label="Fotos ou vídeos do serviço finalizado"
                      />
                    </ActionForm>
                    <p className="text-sm">{b._count.evidence} arquivo(s) enviado(s).</p>
                    <ActionForm action={finishServiceAction} submitLabel="Finalizar serviço" confirm="Finalizar o serviço? O cliente será avisado para confirmar.">
                      <input type="hidden" name="bookingId" value={b.id} />
                    </ActionForm>
                  </div>
                ) : null}

                {b.status === "COMPLETION_PENDING" ? (
                  <p className="mt-3 text-xs text-muted">Aguardando o cliente confirmar. Sem contestação em 48h, o serviço é concluído automaticamente e seu repasse liberado.</p>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
