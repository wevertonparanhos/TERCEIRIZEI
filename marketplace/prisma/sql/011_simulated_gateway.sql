-- 011 — Provedor de pagamentos SIMULADO + tipos de repasse.
--
-- A tabela sim_gateway_charges representa o "sistema externo" do provedor de
-- SIMULAÇÃO (desenvolvimento). A aplicação NUNCA confia nela diretamente: o
-- status oficial chega por webhook assinado e é reconsultado no adaptador —
-- exatamente como será com um provedor real. Não contém dinheiro real.

create table public.sim_gateway_charges (
  id text primary key,
  external_reference text not null,
  method text not null,
  amount_cents integer not null check (amount_cents > 0),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'RECEIVED', 'DECLINED', 'EXPIRED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
  expires_at timestamptz(6) not null,
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp
);
alter table public.sim_gateway_charges enable row level security;
grant select, insert, update on public.sim_gateway_charges to marketplace_app;

-- SERVICE = pagamento pelo serviço concluído; CANCELLATION_FEE = parte retida
-- em cancelamento tardio (compensação do horário reservado do profissional).
alter table public.provider_payouts
  add column kind text not null default 'SERVICE' check (kind in ('SERVICE', 'CANCELLATION_FEE')),
  add column note text;

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
    if new.kind = 'SERVICE' and st is distinct from 'COMPLETED' then
      raise exception 'Repasse bloqueado: o serviço ainda não foi concluído (pedido %).', st using errcode = 'P0001';
    end if;
    if new.kind = 'CANCELLATION_FEE' and st not in ('REFUNDED', 'CANCELLED') then
      raise exception 'Compensação só para pedido cancelado/reembolsado (pedido %).', st using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
