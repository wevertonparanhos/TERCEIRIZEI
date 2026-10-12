-- 008 — Evidência de conclusão e trava de repasse (regra do negócio, 2026-10-12):
-- "o pagamento ao prestador só é enviado após ele enviar foto/vídeo do serviço
-- finalizado e/ou o cliente marcar o serviço como concluído".

create table public.booking_evidence (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete restrict on update cascade,
  uploaded_by uuid not null references public.users(id) on delete restrict on update cascade,
  -- Caminho no bucket PRIVADO do Supabase Storage (acesso só por URL temporária).
  storage_path text not null unique,
  media_type text not null check (media_type in ('IMAGE', 'VIDEO')),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 104857600),
  caption text check (caption is null or char_length(caption) <= 300),
  created_at timestamptz(6) not null default current_timestamp
);
create index booking_evidence_booking_id_idx on public.booking_evidence (booking_id);
alter table public.booking_evidence enable row level security;

alter table public.bookings add column provider_finished_at timestamptz(6);

-- Profissional só passa o pedido para "aguardando confirmação" com evidência anexada.
create or replace function public.require_completion_evidence()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'COMPLETION_PENDING' and old.status is distinct from 'COMPLETION_PENDING'
     and not exists (select 1 from public.booking_evidence e where e.booking_id = new.id) then
    raise exception 'Envie ao menos uma foto ou vídeo do serviço finalizado.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger bookings_require_evidence
  before update of status on public.bookings
  for each row execute function public.require_completion_evidence();

-- Repasse só pode ser agendado/pago para pedido CONCLUÍDO.
create or replace function public.guard_payout_release()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  st public.booking_status;
begin
  if new.status in ('SCHEDULED', 'PAID') then
    select status into st from public.bookings where id = new.booking_id;
    if st is distinct from 'COMPLETED' then
      raise exception 'Repasse bloqueado: o serviço ainda não foi concluído (pedido %).', st using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger provider_payouts_guard_release
  before insert or update of status on public.provider_payouts
  for each row execute function public.guard_payout_release();

grant select, insert, update, delete on public.booking_evidence to marketplace_app;
revoke execute on function public.require_completion_evidence() from public, anon, authenticated;
revoke execute on function public.guard_payout_release() from public, anon, authenticated;
