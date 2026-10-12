-- 007 — Reserva temporária de horário (Fase 2).
--
-- Pedido criado no checkout fica AWAITING_PAYMENT com hold_expires_at. Se o
-- pagamento não for iniciado a tempo, o pedido EXPIRA e o horário volta a
-- ficar livre (a exclusion constraint só considera status ativos).
-- Executado: (1) pela aplicação antes de calcular horários/criar pedido;
-- (2) pelo pg_cron a cada minuto, como rede de segurança.

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
    update public.bookings
       set status = 'EXPIRED', cancelled_at = now(), cancel_reason = 'Reserva expirada sem pagamento', updated_at = now()
     where status = 'AWAITING_PAYMENT' and hold_expires_at is not null and hold_expires_at < now()
    returning id
  ), hist as (
    insert into public.booking_status_history (booking_id, from_status, to_status, actor_type, reason)
    select id, 'AWAITING_PAYMENT', 'EXPIRED', 'SYSTEM', 'Reserva expirada sem pagamento' from expired
    returning 1
  )
  select count(*) into n from hist;
  return n;
end;
$$;

revoke execute on function public.expire_stale_holds() from public, anon, authenticated;
grant execute on function public.expire_stale_holds() to marketplace_app;

-- Consulta frequente: pedidos ativos de um profissional por período.
create index if not exists bookings_provider_active_idx
  on public.bookings (provider_id, scheduled_start)
  where status in ('AWAITING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETION_PENDING');

create extension if not exists pg_cron;
select cron.schedule('expire-booking-holds', '* * * * *', $$select public.expire_stale_holds()$$);
