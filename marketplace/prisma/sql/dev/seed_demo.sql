-- SEED DE DEMONSTRAÇÃO — SOMENTE DESENVOLVIMENTO. NÃO EXECUTAR EM PRODUÇÃO.
--
-- Cria 3 profissionais FICTÍCIOS (users.is_demo = true, e-mails @exemplo.invalid,
-- sem senha: não conseguem fazer login) com preços DEMONSTRATIVOS, para que o
-- catálogo mostre valores durante o desenvolvimento. Os valores não são preços
-- de mercado. Remover com o bloco "LIMPEZA" no fim do arquivo.

do $$
declare
  demo record;
  prov uuid;
begin
  for demo in
    select * from (values
      ('00000000-0000-4000-8000-0000000000d1'::uuid, 'demo.ana@exemplo.invalid',   'Ana Souza (demonstração)',    'Belo Horizonte', 'MG', 6,  1.00),
      ('00000000-0000-4000-8000-0000000000d2'::uuid, 'demo.bruno@exemplo.invalid', 'Bruno Lima (demonstração)',   'Contagem',       'MG', 3,  0.90),
      ('00000000-0000-4000-8000-0000000000d3'::uuid, 'demo.carla@exemplo.invalid', 'Carla Mendes (demonstração)', 'Nova Lima',      'MG', 10, 1.15)
    ) as t(id, email, name, city, uf, years, factor)
  loop
    if not exists (select 1 from auth.users where id = demo.id) then
      insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
      values (demo.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', demo.email,
              jsonb_build_object('name', demo.name, 'role', 'PROVIDER'), now(), now());
    end if;

    update public.users set is_demo = true where id = demo.id;

    update public.provider_profiles
       set status = 'APPROVED', approved_at = now(), base_city = demo.city, base_state = demo.uf,
           experience_years = demo.years, phone = '31900000000',
           bio = 'Perfil FICTÍCIO criado para demonstração da plataforma.'
     where user_id = demo.id
     returning id into prov;

    insert into public.provider_categories (provider_id, category_id)
    select prov, id from public.service_categories
     where slug in ('limpeza-residencial', 'limpeza-pesada', 'limpeza-pos-obra', 'pintura-residencial', 'pequenos-reparos')
    on conflict do nothing;

    -- Preços demonstrativos dos pacotes (base × fator do profissional, arredondado a R$ 5).
    insert into public.provider_offers (provider_id, service_id, package_id, price_cents)
    select prov, p.service_id, p.id,
           (round(base.cents * demo.factor / 500.0) * 500)::int
      from public.service_packages p
      join (values ('ate-2-quartos', 'limpeza-basica', 18000), ('ate-3-quartos', 'limpeza-basica', 24000),
                   ('ate-2-quartos', 'limpeza-pesada', 32000), ('ate-3-quartos', 'limpeza-pesada', 42000),
                   ('ate-60-m2', 'limpeza-pos-obra', 45000), ('ate-100-m2', 'limpeza-pos-obra', 68000)) as base(pkg, svc, cents)
        on base.pkg = p.slug
      join public.services s on s.id = p.service_id and s.slug = base.svc
    on conflict do nothing;

    insert into public.provider_offers (provider_id, service_id, addon_id, price_cents)
    select prov, a.service_id, a.id,
           (round(base.cents * demo.factor / 100.0) * 100)::int
      from public.service_addons a
      join (values ('Limpeza de forno', 3500), ('Limpeza de geladeira', 3500), ('Janelas acessíveis', 1000),
                   ('Armários por dentro', 1500), ('Varanda', 3000), ('Imóvel com animais', 2000),
                   ('Banheiro adicional', 3000), ('Metragem adicional', 2500)) as base(name, cents)
        on base.name = a.name
    on conflict do nothing;

    insert into public.provider_offers (provider_id, service_id, price_rule_id, price_cents, base_cents, min_total_cents)
    select prov, r.service_id, r.id,
           (round(base.unit * demo.factor / 10.0) * 10)::int, base.fixed, base.minimum
      from public.price_rules r
      join public.services s on s.id = r.service_id
      join (values ('pintura-paredes-internas', 2500, 0, 30000), ('reparos-por-hora', 7000, 0, 9000)) as base(svc, unit, fixed, minimum)
        on base.svc = s.slug
    on conflict do nothing;
  end loop;
end $$;

-- LIMPEZA (remove todos os dados fictícios acima):
-- delete from public.provider_offers where provider_id in (select id from public.provider_profiles where user_id in (select id from public.users where is_demo));
-- delete from auth.users where id in (select id from public.users where is_demo);
