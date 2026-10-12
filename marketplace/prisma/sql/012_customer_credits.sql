-- 012 — Créditos do cliente + nova regra de cancelamento (2026-10-12):
-- cancelamento com >= 24h → reembolso integral; com < 24h → o cliente escolhe
-- CRÉDITO integral na plataforma ou ESTORNO com a taxa de serviço retida.

create table public.customer_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict on update cascade,
  booking_id uuid references public.bookings(id) on delete restrict on update cascade,
  amount_cents integer not null check (amount_cents <> 0),
  kind text not null check (kind in ('CANCELLATION_CREDIT', 'PAYMENT', 'PAYMENT_REVERSAL', 'REFUND_TO_CREDIT', 'ADMIN_ADJUSTMENT')),
  description text not null,
  created_by uuid references public.users(id),
  created_at timestamptz(6) not null default current_timestamp
);
create index customer_credits_user_idx on public.customer_credits (user_id, created_at);
alter table public.customer_credits enable row level security;
grant select, insert on public.customer_credits to marketplace_app;

-- Saldo nunca negativo, mesmo com usos simultâneos (trava por usuário).
create or replace function public.guard_credit_balance()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  balance integer;
begin
  perform pg_advisory_xact_lock(hashtext('credit:' || new.user_id::text));
  select coalesce(sum(amount_cents), 0) into balance from public.customer_credits where user_id = new.user_id;
  if balance + new.amount_cents < 0 then
    raise exception 'Saldo de crédito insuficiente.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger customer_credits_guard_balance
  before insert on public.customer_credits
  for each row execute function public.guard_credit_balance();
create trigger customer_credits_immutable
  before update or delete on public.customer_credits
  for each row execute function public.forbid_mutation();

alter table public.bookings add column credit_applied_cents integer not null default 0;
alter table public.bookings add constraint bookings_credit_chk check (credit_applied_cents >= 0 and credit_applied_cents <= total_cents);

-- Expiração devolve o crédito usado em pedido que não chegou a ser pago.
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
    returning b.id, b.customer_id, b.credit_applied_cents, b.code, b.cancel_reason,
      case when b.cancel_reason = 'Profissional não respondeu no prazo' then 'AWAITING_PROVIDER' else 'AWAITING_PAYMENT' end::public.booking_status as from_status
  ), credits as (
    insert into public.customer_credits (user_id, booking_id, amount_cents, kind, description)
    select customer_id, id, credit_applied_cents, 'PAYMENT_REVERSAL', 'Crédito devolvido: pedido ' || code || ' expirou sem pagamento'
      from expired where credit_applied_cents > 0
    returning 1
  ), hist as (
    insert into public.booking_status_history (booking_id, from_status, to_status, actor_type, reason)
    select id, from_status, 'EXPIRED', 'SYSTEM', cancel_reason from expired
    returning 1
  )
  select count(*) into n from hist;
  return n;
end;
$$;

-- Política de cancelamento conforme a regra do negócio (minuta — revisão jurídica).
update public.cancellation_policies
   set name = 'Padrão',
       description = 'Cancelamento com pelo menos 24 horas de antecedência: reembolso integral. Com menos de 24 horas, o cliente escolhe entre crédito integral na plataforma ou estorno do valor pago com a taxa de serviço retida. Se o profissional cancelar, o reembolso é sempre integral. O direito de arrependimento previsto no Código de Defesa do Consumidor é respeitado.',
       tiers = '[{"minHoursBefore": 24, "refundBps": 10000}]'
 where id = '00000000-0000-4000-8000-000000000c01';

insert into public.administrative_settings (key, value) values ('cancellation.fullRefundMinHours', '24')
on conflict (key) do nothing;

revoke execute on function public.guard_credit_balance() from public, anon, authenticated;
