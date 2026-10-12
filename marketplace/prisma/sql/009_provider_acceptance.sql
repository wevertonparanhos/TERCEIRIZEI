-- 009 — Aceite do profissional (regra do negócio, 2026-10-12): todo pedido
-- precisa ser ACEITO pelo profissional antes do pagamento.
--
-- Fluxo: cliente solicita → AWAITING_PROVIDER (horário segurado até o prazo
-- de resposta) → profissional ACEITA → AWAITING_PAYMENT (prazo para pagar)
--                                   ou RECUSA → DECLINED (nada é cobrado).
-- Sem resposta no prazo → EXPIRED. Os valores ficam congelados desde a solicitação.
--
-- Parte A (executada antes, em transação separada — exigência do PostgreSQL
-- para usar valores novos de enum):
--   alter type public.booking_status add value if not exists 'AWAITING_PROVIDER' before 'AWAITING_PAYMENT';
--   alter type public.booking_status add value if not exists 'DECLINED' after 'CANCELLED';

alter table public.bookings
  add column provider_response_deadline timestamptz(6),
  add column provider_responded_at timestamptz(6),
  add column decline_reason text check (decline_reason is null or char_length(decline_reason) <= 300);

-- Solicitação pendente também ocupa o horário do profissional.
alter table public.bookings drop constraint bookings_no_overlap;
alter table public.bookings
  add constraint bookings_no_overlap exclude using gist (
    provider_id with =,
    tstzrange(scheduled_start, blocked_until, '[)') with &&
  ) where (
    provider_id is not null and status in (
      'AWAITING_PROVIDER', 'AWAITING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETION_PENDING'
    )
  );

drop index if exists public.bookings_provider_active_idx;
create index bookings_provider_active_idx
  on public.bookings (provider_id, scheduled_start)
  where status in ('AWAITING_PROVIDER', 'AWAITING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETION_PENDING');

-- Expiração: solicitação sem resposta e pagamento não feito.
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with expired as (
    update public.bookings b
       set status = 'EXPIRED', cancelled_at = now(), updated_at = now(),
           cancel_reason = case when b.status = 'AWAITING_PROVIDER' then 'Profissional não respondeu no prazo'
                                else 'Pagamento não realizado no prazo' end
     where (b.status = 'AWAITING_PAYMENT' and b.hold_expires_at is not null and b.hold_expires_at < now())
        or (b.status = 'AWAITING_PROVIDER' and b.provider_response_deadline is not null and b.provider_response_deadline < now())
    returning b.id, b.cancel_reason,
      case when b.cancel_reason = 'Profissional não respondeu no prazo' then 'AWAITING_PROVIDER' else 'AWAITING_PAYMENT' end::public.booking_status as from_status
  ), hist as (
    insert into public.booking_status_history (booking_id, from_status, to_status, actor_type, reason)
    select id, from_status, 'EXPIRED', 'SYSTEM', cancel_reason from expired
    returning 1
  )
  select count(*) into n from hist;
  return n;
end;
$$;

insert into public.administrative_settings (key, value) values
  ('booking.providerResponseHours', '12')
on conflict (key) do nothing;
-- Prazo para pagar após o aceite (o cliente pode não estar online na hora do aceite).
update public.administrative_settings set value = '120' where key = 'booking.holdMinutes';
