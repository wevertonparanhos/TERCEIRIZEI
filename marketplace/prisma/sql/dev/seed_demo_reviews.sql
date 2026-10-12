-- SEED DE DEMONSTRAÇÃO (avaliações) — SOMENTE DESENVOLVIMENTO.
-- Requer dev/seed_demo.sql. Cria clientes FICTÍCIOS (is_demo, sem senha),
-- pedidos CONCLUÍDOS fictícios (código DEMO-*) e avaliações, passando pelos
-- mesmos gatilhos/CHECKs de produção. Idempotente.

do $$
declare
  c record;
  r record;
  cust_ids uuid[] := array[]::uuid[];
  addr uuid;
  bid uuid;
  prov uuid;
  pkg record;
  n int := 0;
begin
  -- Clientes fictícios
  for c in select * from (values
    ('00000000-0000-4000-8000-0000000000c1'::uuid, 'demo.cliente1@exemplo.invalid', 'Mariana Alves Costa'),
    ('00000000-0000-4000-8000-0000000000c2'::uuid, 'demo.cliente2@exemplo.invalid', 'Rafael Nogueira'),
    ('00000000-0000-4000-8000-0000000000c3'::uuid, 'demo.cliente3@exemplo.invalid', 'Juliana Prado Reis'),
    ('00000000-0000-4000-8000-0000000000c4'::uuid, 'demo.cliente4@exemplo.invalid', 'Pedro Henrique Dias'),
    ('00000000-0000-4000-8000-0000000000c5'::uuid, 'demo.cliente5@exemplo.invalid', 'Camila Teixeira'),
    ('00000000-0000-4000-8000-0000000000c6'::uuid, 'demo.cliente6@exemplo.invalid', 'Lucas Fernandes')
  ) as t(id, email, name)
  loop
    if not exists (select 1 from auth.users where id = c.id) then
      insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      values (c.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', c.email,
              jsonb_build_object('name', c.name), now(), now());
    end if;
    update public.users set is_demo = true where id = c.id;
    if not exists (select 1 from public.addresses where user_id = c.id) then
      insert into public.addresses (user_id, cep, street, number, neighborhood, city, state, is_default)
      values (c.id, '30140000', 'Rua Fictícia', '100', 'Centro', 'Belo Horizonte', 'MG', true);
    end if;
    cust_ids := cust_ids || c.id;
  end loop;

  -- (profissional, cliente#, nota, pontualidade, qualidade, comunicação, cuidado, custo-benefício, tags, comentário, resposta, dias atrás)
  for r in select * from (values
    ('d1', 1, 5, 5, 5, 5, 5, 5, array['pontual','caprichoso','organizado'], 'A Ana deixou o apartamento impecável, inclusive cantos que eu nem lembrava. Super educada e pontual.', 'Obrigada, Mariana! Foi um prazer atender você.', 40),
    ('d1', 2, 5, 5, 5, 4, 5, 5, array['caprichoso','agil'], 'Serviço rápido e muito bem feito. Recomendo.', null, 32),
    ('d1', 3, 4, 4, 5, 4, 5, 4, array['educado','caprichoso'], 'Ótima limpeza. Chegou uns 15 minutos depois do combinado, mas avisou antes.', 'Obrigada pelo retorno, Juliana! O trânsito atrapalhou naquele dia.', 25),
    ('d1', 4, 5, 5, 5, 5, 5, 4, array['pontual','comunicacao'], null, null, 18),
    ('d1', 5, 5, 5, 5, 5, 5, 5, array['superou','caprichoso'], 'Superou as expectativas! Já agendei de novo.', null, 9),
    ('d2', 2, 4, 4, 4, 4, 4, 5, array['pontual','agil'], 'Bom serviço pelo preço. Cozinha ficou ótima.', null, 30),
    ('d2', 6, 2, 2, 3, 2, 3, 3, array['atraso','incompleto'], 'Atrasou mais de uma hora e não limpou a área de serviço, que estava no pacote.', 'Peço desculpas, Lucas. Tive um problema com o transporte e já ajustei minha agenda.', 21),
    ('d2', 1, 4, 5, 4, 4, 4, 4, array['educado'], 'Atencioso e cuidadoso com os móveis.', null, 12),
    ('d3', 3, 5, 5, 5, 5, 5, 4, array['caprichoso','organizado','comunicacao'], 'Limpeza pós-obra excelente. Tirou respingos de tinta do piso que eu achava impossível.', 'Muito obrigada, Juliana! Ficou lindo o apartamento.', 35),
    ('d3', 4, 5, 5, 5, 5, 5, 5, array['superou','pontual'], 'Profissional de altíssimo nível.', null, 14)
  ) as t(prov_key, cust_no, rating, p_r, q_r, c_r, ca_r, v_r, tags, comment, reply, days_ago)
  loop
    n := n + 1;
    if exists (select 1 from public.bookings where code = 'DEMO-' || lpad(n::text, 4, '0')) then
      continue;
    end if;

    select p.id into prov from public.provider_profiles p
     where p.user_id = ('00000000-0000-4000-8000-0000000000' || r.prov_key)::uuid;
    select id into addr from public.addresses where user_id = cust_ids[r.cust_no] limit 1;
    select o.price_cents, sp.id as package_id, sp.service_id, sp.name, sp.duration_minutes into pkg
      from public.provider_offers o join public.service_packages sp on sp.id = o.package_id
     where o.provider_id = prov order by sp.service_id, sp.sort_order limit 1;

    insert into public.bookings (code, customer_id, provider_id, service_id, package_id, address_id, status,
      scheduled_start, scheduled_end, blocked_until, snapshot,
      provider_subtotal_cents, commission_mode, gross_cents, total_cents, commission_rate_bps, commission_cents,
      provider_share_cents, discount_bearer, fee_bearer, confirmed_at, completed_at)
    values ('DEMO-' || lpad(n::text, 4, '0'), cust_ids[r.cust_no], prov, pkg.service_id, pkg.package_id, addr, 'COMPLETED',
      now() - make_interval(days => r.days_ago + 1), now() - make_interval(days => r.days_ago + 1) + make_interval(mins => pkg.duration_minutes),
      now() - make_interval(days => r.days_ago + 1) + make_interval(mins => pkg.duration_minutes),
      jsonb_build_object('demo', true, 'package', pkg.name),
      pkg.price_cents, 'ON_TOP', pkg.price_cents + round(pkg.price_cents * 0.2)::int, pkg.price_cents + round(pkg.price_cents * 0.2)::int,
      2000, round(pkg.price_cents * 0.2)::int, pkg.price_cents, 'PLATFORM', 'PLATFORM',
      now() - make_interval(days => r.days_ago + 3), now() - make_interval(days => r.days_ago))
    returning id into bid;

    insert into public.reviews (booking_id, customer_id, provider_id, rating, punctuality_rating, quality_rating,
      communication_rating, care_rating, value_rating, tags, comment, provider_reply, provider_replied_at, created_at)
    values (bid, cust_ids[r.cust_no], prov, r.rating, r.p_r, r.q_r, r.c_r, r.ca_r, r.v_r, r.tags, r.comment,
      r.reply, case when r.reply is not null then now() - make_interval(days => r.days_ago - 1) end,
      now() - make_interval(days => r.days_ago));
  end loop;
end $$;

-- LIMPEZA: os pedidos/avaliações DEMO-* são removidos junto com os usuários fictícios:
-- delete from public.reviews where booking_id in (select id from public.bookings where code like 'DEMO-%');
-- delete from public.bookings where code like 'DEMO-%';
-- (depois, o bloco LIMPEZA de dev/seed_demo.sql)
