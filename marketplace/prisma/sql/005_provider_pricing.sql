-- 005 — Modelo de preço definido pelo PRESTADOR (decisão do negócio, 2026-10-12).
--
-- A plataforma define o ESCOPO padronizado (pacotes, adicionais, unidades de
-- preço calculado). Cada prestador publica o SEU preço para esses itens
-- (provider_offers). O cliente paga preço do prestador + comissão da
-- plataforma (padrão 20%, modo ON_TOP). Preços demonstrativos do catálogo
-- deixam de existir: valores de demonstração ficam só em ofertas de contas
-- fictícias (users.is_demo).

alter table public.service_packages drop column price_cents, drop column is_demo_price;
alter table public.service_addons drop column price_cents, drop column is_demo_price;

alter table public.price_rules drop constraint if exists price_rules_values_chk;
alter table public.price_rules
  drop column base_cents, drop column unit_price_cents, drop column min_total_cents, drop column is_demo_price;
alter table public.price_rules
  add constraint price_rules_qty_chk check (min_quantity >= 1 and max_quantity >= min_quantity);

alter table public.users add column is_demo boolean not null default false;

create type public.commission_mode as enum ('ON_TOP', 'INCLUDED');

alter table public.bookings
  add column provider_subtotal_cents integer not null,
  add column commission_mode public.commission_mode not null;

-- Coerência do valor cobrado com o modo de comissão.
alter table public.bookings
  add constraint bookings_commission_mode_chk check (
    provider_subtotal_cents >= 0 and (
      (commission_mode = 'ON_TOP'
        and gross_cents = provider_subtotal_cents + commission_cents
        and provider_share_cents = provider_subtotal_cents)
      or
      (commission_mode = 'INCLUDED'
        and gross_cents = provider_subtotal_cents
        and provider_share_cents = provider_subtotal_cents - commission_cents)
    )
  );

-- O gatilho de imutabilidade passa a proteger também o subtotal e o modo.
create or replace function public.protect_confirmed_booking()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status not in ('DRAFT', 'AWAITING_PAYMENT', 'PAYMENT_PROCESSING') then
    if new.gross_cents <> old.gross_cents
       or new.provider_subtotal_cents <> old.provider_subtotal_cents
       or new.commission_mode <> old.commission_mode
       or new.discount_cents <> old.discount_cents
       or new.total_cents <> old.total_cents
       or new.commission_rate_bps <> old.commission_rate_bps
       or new.commission_cents <> old.commission_cents
       or new.provider_share_cents <> old.provider_share_cents
       or new.snapshot::text <> old.snapshot::text
       or new.service_id <> old.service_id
       or new.package_id is distinct from old.package_id
       or new.provider_id is distinct from old.provider_id then
      raise exception 'Pedido % já confirmado: preço, comissão, escopo e profissional são imutáveis.', old.code
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create table public.provider_offers (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade on update cascade,
  service_id uuid not null references public.services(id) on delete cascade on update cascade,
  package_id uuid references public.service_packages(id) on delete cascade on update cascade,
  addon_id uuid references public.service_addons(id) on delete cascade on update cascade,
  price_rule_id uuid references public.price_rules(id) on delete cascade on update cascade,
  price_cents integer not null,
  base_cents integer not null default 0,
  min_total_cents integer not null default 0,
  active boolean not null default true,
  created_at timestamptz(6) not null default current_timestamp,
  updated_at timestamptz(6) not null default current_timestamp,
  constraint provider_offers_one_target_chk check (num_nonnulls(package_id, addon_id, price_rule_id) = 1),
  constraint provider_offers_values_chk check (price_cents > 0 and base_cents >= 0 and min_total_cents >= 0)
);

create unique index provider_offers_provider_id_package_id_key on public.provider_offers (provider_id, package_id);
create unique index provider_offers_provider_id_addon_id_key on public.provider_offers (provider_id, addon_id);
create unique index provider_offers_provider_id_price_rule_id_key on public.provider_offers (provider_id, price_rule_id);
create index provider_offers_service_id_active_idx on public.provider_offers (service_id, active);

alter table public.provider_offers enable row level security;

insert into public.administrative_settings (key, value)
values ('pricing.commissionMode', '"ON_TOP"')
on conflict (key) do nothing;
