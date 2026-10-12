-- 002 — Regras que o Prisma não expressa: vínculo com Supabase Auth,
-- integridade financeira, anti-dupla-reserva e Row Level Security.
--
-- O servidor Next.js acessa o banco via Prisma com a role `postgres` (bypassa
-- RLS) e aplica autorização por recurso em código (src/server/**). A RLS abaixo
-- é defesa em profundidade: a chave publishable/anon do navegador NUNCA
-- consegue ler dados privados diretamente pela API REST do Supabase.

-- ── Vínculo com auth.users ────────────────────────────────────────────────
alter table public.users
  add constraint users_auth_fk foreign key (id) references auth.users(id) on delete cascade;

-- Cadastro: cria a linha em public.users + perfil. O papel vem dos metadados do
-- signUp, mas SÓ pode ser CUSTOMER ou PROVIDER — ninguém vira ADMIN/SUPPORT
-- pelo navegador (promoção é feita por script/admin, com auditoria).
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := coalesce(new.raw_user_meta_data->>'role', 'CUSTOMER');
  final_role public.user_role := case when requested = 'PROVIDER' then 'PROVIDER'::public.user_role
                                      else 'CUSTOMER'::public.user_role end;
  display text := nullif(trim(coalesce(new.raw_user_meta_data->>'name', '')), '');
begin
  insert into public.users (id, email, name, phone, role)
  values (new.id, new.email, coalesce(display, split_part(new.email, '@', 1)),
          nullif(new.raw_user_meta_data->>'phone', ''), final_role);

  if final_role = 'PROVIDER' then
    insert into public.provider_profiles (id, user_id, display_name)
    values (gen_random_uuid(), new.id, coalesce(display, split_part(new.email, '@', 1)));
  else
    insert into public.customer_profiles (user_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- E-mail sincronizado quando o usuário troca o e-mail no Supabase Auth.
create or replace function public.handle_auth_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.users set email = new.email, updated_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_auth_email_change();

-- ── Integridade de valores ────────────────────────────────────────────────
alter table public.service_packages
  add constraint service_packages_price_chk check (price_cents >= 0),
  add constraint service_packages_duration_chk check (duration_minutes > 0),
  add constraint service_packages_professionals_chk check (professionals >= 1);

alter table public.service_addons
  add constraint service_addons_price_chk check (price_cents >= 0),
  add constraint service_addons_qty_chk check (max_quantity >= 1);

alter table public.price_rules
  add constraint price_rules_values_chk check (
    base_cents >= 0 and unit_price_cents >= 0 and min_total_cents >= 0
    and min_quantity >= 1 and max_quantity >= min_quantity
  );

alter table public.commission_rules
  add constraint commission_rules_rate_chk check (rate_bps between 0 and 10000),
  add constraint commission_rules_scope_chk check (
    (scope = 'GLOBAL'   and category_id is null and service_id is null and coupon_id is null) or
    (scope = 'CATEGORY' and category_id is not null) or
    (scope = 'SERVICE'  and service_id is not null) or
    (scope = 'CAMPAIGN' and coupon_id is not null)
  );

-- No máximo uma regra GLOBAL ativa por vez.
create unique index commission_rules_one_active_global
  on public.commission_rules (scope) where scope = 'GLOBAL' and active;

alter table public.coupons
  add constraint coupons_value_chk check (
    (discount_type = 'PERCENT' and percent_bps between 1 and 10000) or
    (discount_type = 'FIXED' and amount_cents > 0)
  );

alter table public.bookings
  add constraint bookings_money_chk check (
    gross_cents >= 0 and discount_cents >= 0 and discount_cents <= gross_cents
    and total_cents = gross_cents - discount_cents
    and commission_rate_bps between 0 and 10000
    and commission_cents >= 0 and provider_share_cents >= 0
    and refunded_cents >= 0 and refunded_cents <= total_cents
  ),
  add constraint bookings_time_chk check (scheduled_end > scheduled_start and blocked_until >= scheduled_end);

alter table public.payment_transactions
  add constraint payment_amount_chk check (amount_cents > 0);

alter table public.refunds
  add constraint refunds_amount_chk check (amount_cents > 0);

alter table public.reviews
  add constraint reviews_rating_chk check (rating between 1 and 5);

alter table public.provider_availability
  add constraint provider_availability_chk check (
    weekday between 0 and 6 and start_minute >= 0 and end_minute <= 1440 and end_minute > start_minute
  );

alter table public.provider_time_off
  add constraint provider_time_off_chk check (ends_at > starts_at);

-- Apenas um endereço padrão por usuário.
create unique index addresses_one_default_per_user
  on public.addresses (user_id) where is_default;

-- ── Anti-dupla-reserva (concorrência) ─────────────────────────────────────
-- Dois pedidos ativos do mesmo prestador nunca se sobrepõem (incluindo o
-- intervalo de deslocamento). Garantido pelo PostgreSQL, não pela aplicação:
-- duas reservas simultâneas → uma falha com exclusion_violation (23P01).
create schema if not exists extensions;
create extension if not exists btree_gist with schema extensions;

alter table public.bookings
  add constraint bookings_no_overlap exclude using gist (
    provider_id with =,
    tstzrange(scheduled_start, blocked_until, '[)') with &&
  ) where (
    provider_id is not null and status in (
      'AWAITING_PAYMENT', 'PAYMENT_PROCESSING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETION_PENDING'
    )
  );

-- ── Imutabilidade financeira ──────────────────────────────────────────────
-- Depois da confirmação, valores e snapshot do pedido não mudam (nem por bug
-- da aplicação). Reembolsos só alteram refunded_cents.
create or replace function public.protect_confirmed_booking()
returns trigger
language plpgsql
as $$
begin
  if old.status not in ('DRAFT', 'AWAITING_PAYMENT', 'PAYMENT_PROCESSING') then
    if new.gross_cents <> old.gross_cents
       or new.discount_cents <> old.discount_cents
       or new.total_cents <> old.total_cents
       or new.commission_rate_bps <> old.commission_rate_bps
       or new.commission_cents <> old.commission_cents
       or new.provider_share_cents <> old.provider_share_cents
       or new.snapshot::text <> old.snapshot::text
       or new.service_id <> old.service_id
       or new.package_id is distinct from old.package_id then
      raise exception 'Pedido % já confirmado: preço, comissão e escopo são imutáveis.', old.code
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger bookings_protect_confirmed
  before update on public.bookings
  for each row execute function public.protect_confirmed_booking();

-- Trilhas imutáveis: histórico de status, alterações de preço e auditoria
-- não aceitam UPDATE/DELETE.
create or replace function public.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Registro imutável (%).', tg_table_name using errcode = 'P0001';
end;
$$;

create trigger booking_status_history_immutable
  before update or delete on public.booking_status_history
  for each row execute function public.forbid_mutation();
create trigger price_changes_immutable
  before update or delete on public.price_changes
  for each row execute function public.forbid_mutation();
create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.forbid_mutation();

-- ── Row Level Security ────────────────────────────────────────────────────
-- Habilitada em TODAS as tabelas. Sem policy = negado para anon/authenticated.
do $$
declare t text;
begin
  foreach t in array array[
    'users','customer_profiles','provider_profiles','provider_documents','provider_categories',
    'provider_service_areas','provider_availability','provider_time_off','cities',
    'service_categories','services','service_packages','service_addons','price_rules',
    'price_changes','commission_rules','cancellation_policies','coupons','addresses',
    'bookings','booking_items','booking_status_history','quote_requests',
    'payment_transactions','payment_webhook_events','platform_commissions','provider_payouts',
    'refunds','reviews','support_tickets','notifications','consent_records','audit_logs',
    'administrative_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Catálogo público (somente leitura do que está ativo/publicado).
create policy catalog_categories_read on public.service_categories
  for select to anon, authenticated using (active);
create policy catalog_services_read on public.services
  for select to anon, authenticated using (active and published);
create policy catalog_packages_read on public.service_packages
  for select to anon, authenticated using (
    active and exists (select 1 from public.services s where s.id = service_id and s.active and s.published)
  );
create policy catalog_addons_read on public.service_addons
  for select to anon, authenticated using (
    active and exists (select 1 from public.services s where s.id = service_id and s.active and s.published)
  );
create policy catalog_cities_read on public.cities
  for select to anon, authenticated using (active);

-- Dados próprios do usuário autenticado.
create policy users_self_read on public.users
  for select to authenticated using (id = (select auth.uid()));
create policy addresses_owner_all on public.addresses
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_owner_read on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy bookings_customer_read on public.bookings
  for select to authenticated using (customer_id = (select auth.uid()));

-- Funções SECURITY DEFINER não devem ser chamáveis via API REST.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.handle_auth_email_change() from public, anon, authenticated;
revoke execute on function public.protect_confirmed_booking() from public, anon, authenticated;
revoke execute on function public.forbid_mutation() from public, anon, authenticated;
