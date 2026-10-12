-- 006 — Avaliações estilo Airbnb/Uber.
--
-- Nota geral (1–5) + notas por critério (opcionais) + elogios/pontos de
-- melhoria (tags) + comentário + resposta pública do profissional + moderação.
-- O banco garante: só o cliente de um pedido CONCLUÍDO avalia o profissional
-- daquele pedido, uma vez (unique booking_id), e a média do profissional é
-- sempre recalculada a partir das avaliações publicadas.

alter table public.reviews
  add column punctuality_rating integer,
  add column quality_rating integer,
  add column communication_rating integer,
  add column care_rating integer,
  add column value_rating integer,
  add column tags text[] not null default '{}',
  add column provider_reply text,
  add column provider_replied_at timestamptz(6),
  add column moderation_reason text,
  add column moderated_by uuid,
  add column moderated_at timestamptz(6),
  add column updated_at timestamptz(6) not null default current_timestamp;

alter table public.reviews
  add constraint reviews_criteria_chk check (
    (punctuality_rating is null or punctuality_rating between 1 and 5) and
    (quality_rating is null or quality_rating between 1 and 5) and
    (communication_rating is null or communication_rating between 1 and 5) and
    (care_rating is null or care_rating between 1 and 5) and
    (value_rating is null or value_rating between 1 and 5)
  ),
  add constraint reviews_comment_len_chk check (comment is null or char_length(comment) <= 1000),
  add constraint reviews_reply_len_chk check (provider_reply is null or char_length(provider_reply) <= 600),
  add constraint reviews_tags_len_chk check (cardinality(tags) <= 8),
  -- Nota baixa exige justificativa (como no Uber).
  add constraint reviews_low_rating_comment_chk check (rating > 2 or char_length(coalesce(comment, '')) >= 10);

create index reviews_provider_published_created_idx
  on public.reviews (provider_id, created_at desc) where status = 'PUBLISHED';

-- Integridade: avaliação só de pedido concluído, pelas partes corretas.
create or replace function public.validate_review()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  b record;
begin
  select status, customer_id, provider_id into b from public.bookings where id = new.booking_id;
  if not found then
    raise exception 'Pedido inexistente.' using errcode = 'P0001';
  end if;
  if b.status <> 'COMPLETED' then
    raise exception 'Só é possível avaliar pedidos concluídos.' using errcode = 'P0001';
  end if;
  if b.customer_id <> new.customer_id or b.provider_id is distinct from new.provider_id then
    raise exception 'Avaliação não corresponde às partes do pedido.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger reviews_validate
  before insert on public.reviews
  for each row execute function public.validate_review();

-- Depois de criada, a avaliação não muda de autor, pedido, profissional nem nota.
create or replace function public.protect_review()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.booking_id <> old.booking_id or new.customer_id <> old.customer_id or new.provider_id <> old.provider_id
     or new.rating <> old.rating or new.comment is distinct from old.comment or new.tags <> old.tags
     or new.created_at <> old.created_at then
    raise exception 'A avaliação não pode ser alterada após publicada.' using errcode = 'P0001';
  end if;
  if old.provider_reply is not null and new.provider_reply is distinct from old.provider_reply then
    raise exception 'A resposta do profissional já foi publicada.' using errcode = 'P0001';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_protect
  before update on public.reviews
  for each row execute function public.protect_review();

-- Média do profissional sempre derivada das avaliações PUBLICADAS.
create or replace function public.refresh_provider_rating()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  pid uuid := coalesce(new.provider_id, old.provider_id);
begin
  update public.provider_profiles p
     set rating_sum = coalesce(s.total, 0), rating_count = coalesce(s.n, 0)
    from (select sum(rating)::int as total, count(*)::int as n
            from public.reviews where provider_id = pid and status = 'PUBLISHED') s
   where p.id = pid;
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update of status or delete on public.reviews
  for each row execute function public.refresh_provider_rating();

revoke execute on function public.validate_review() from public, anon, authenticated;
revoke execute on function public.protect_review() from public, anon, authenticated;
revoke execute on function public.refresh_provider_rating() from public, anon, authenticated;
