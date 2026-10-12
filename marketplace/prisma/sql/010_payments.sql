-- 010 — Pagamentos, repasses e evidências (Fase 3).

alter table public.payment_transactions
  add column pix_copy_paste text,
  add column checkout_url text,
  add column provider_status text;

-- Nunca duas cobranças pendentes nem dois pagamentos aprovados para o mesmo pedido.
create unique index payment_one_pending_per_booking on public.payment_transactions (booking_id) where status = 'PENDING';
create unique index payment_one_approved_per_booking on public.payment_transactions (booking_id) where status = 'APPROVED';

alter table public.provider_payouts
  add constraint provider_payouts_values_chk check (gross_cents >= 0 and commission_cents >= 0 and fee_cents >= 0 and net_cents >= 0);

-- Pedido CONCLUÍDO → repasse que estava retido passa a AGENDADO.
create or replace function public.schedule_payout_on_completion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    update public.provider_payouts
       set status = 'SCHEDULED', scheduled_for = now(), updated_at = now()
     where booking_id = new.id and status = 'ON_HOLD';
  elsif new.status in ('DISPUTED', 'REFUND_PENDING') and old.status is distinct from new.status then
    -- Contestação/reembolso: repasse ainda não pago volta a ficar retido.
    update public.provider_payouts set status = 'ON_HOLD', updated_at = now()
     where booking_id = new.id and status = 'SCHEDULED';
  end if;
  return new;
end;
$$;

create trigger bookings_schedule_payout
  after update of status on public.bookings
  for each row execute function public.schedule_payout_on_completion();

-- Conclusão automática: com foto/vídeo e 48h sem resposta do cliente.
create or replace function public.complete_overdue_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with done as (
    update public.bookings b
       set status = 'COMPLETED', completed_at = now(), updated_at = now()
     where b.status = 'COMPLETION_PENDING'
       and b.provider_finished_at is not null
       and b.provider_finished_at < now() - interval '48 hours'
       and exists (select 1 from public.booking_evidence e where e.booking_id = b.id)
    returning b.id
  ), hist as (
    insert into public.booking_status_history (booking_id, from_status, to_status, actor_type, reason)
    select id, 'COMPLETION_PENDING', 'COMPLETED', 'SYSTEM', 'Concluído automaticamente: fotos/vídeos enviados e 48h sem contestação' from done
    returning 1
  )
  select count(*) into n from hist;
  return n;
end;
$$;

revoke execute on function public.schedule_payout_on_completion() from public, anon, authenticated;
revoke execute on function public.complete_overdue_bookings() from public, anon, authenticated;
grant execute on function public.complete_overdue_bookings() to marketplace_app;
select cron.schedule('complete-overdue-bookings', '*/15 * * * *', $$select public.complete_overdue_bookings()$$);

-- Cofre PRIVADO de fotos/vídeos do serviço (acesso só por URL temporária).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('booking-evidence', 'booking-evidence', false, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do nothing;

-- Caminho: <booking_id>/<arquivo>. Só o profissional do pedido envia, e só com o serviço em andamento.
create policy evidence_provider_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'booking-evidence'
    and exists (
      select 1 from public.bookings b
      join public.provider_profiles p on p.id = b.provider_id
      where b.id::text = (storage.foldername(name))[1]
        and p.user_id = (select auth.uid())
        and b.status = 'IN_PROGRESS'
    )
  );

-- Leitura: profissional e cliente do pedido (admin lê via servidor).
create policy evidence_parties_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'booking-evidence'
    and exists (
      select 1 from public.bookings b
      left join public.provider_profiles p on p.id = b.provider_id
      where b.id::text = (storage.foldername(name))[1]
        and (b.customer_id = (select auth.uid()) or p.user_id = (select auth.uid())
             or exists (select 1 from public.users u where u.id = (select auth.uid()) and u.role in ('ADMIN', 'SUPPORT')))
    )
  );

insert into public.administrative_settings (key, value) values ('payments.provider', '"SIMULATED"')
on conflict (key) do nothing;
