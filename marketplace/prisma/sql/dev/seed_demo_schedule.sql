-- SEED DE DEMONSTRAÇÃO (agenda e regiões) — SOMENTE DESENVOLVIMENTO.
-- Profissionais fictícios: segunda a sábado 08:00–18:00 e cidades atendidas.
insert into public.provider_availability (provider_id, weekday, start_minute, end_minute)
select p.id, d, 480, 1080
  from public.provider_profiles p join public.users u on u.id = p.user_id and u.is_demo
  cross join generate_series(1, 6) d
 where not exists (select 1 from public.provider_availability a where a.provider_id = p.id);

insert into public.provider_service_areas (provider_id, city_id, neighborhoods, travel_minutes)
select p.id, c.id, '{}', 30
  from public.provider_profiles p join public.users u on u.id = p.user_id and u.is_demo
  cross join public.cities c
 where c.slug in ('belo-horizonte-mg', 'contagem-mg', 'nova-lima-mg')
on conflict (provider_id, city_id) do nothing;
