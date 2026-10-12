-- 003 — Catálogo inicial (DADOS DE DEMONSTRAÇÃO).
--
-- Observação: os campos de preço deste arquivo foram REMOVIDOS na 005 (o preço
-- passou a ser definido por cada prestador). Aplicar as migrações em ordem.
-- Idempotente: pode ser executado mais de uma vez.
-- ── Configurações administrativas ────────────────────────────────────────
insert into public.administrative_settings (key, value) values
  ('payments.discountBearer', '"PLATFORM"'),
  ('payments.feeBearer', '"PLATFORM"'),
  -- Taxa do provedor de pagamento: 0 até existir contrato real. Não estimar.
  ('payments.estimatedFee', '{"pixBps": 0, "pixFixedCents": 0, "cardBps": 0, "cardFixedCents": 0}'),
  ('booking.holdMinutes', '15'),
  ('booking.minLeadHours', '12'),
  ('booking.slotStepMinutes', '30'),
  ('legal.termsVersion', '"2026-10-minuta"'),
  ('cancellation.cdcWithdrawalDays', '7')
on conflict (key) do nothing;

-- Comissão global padrão: 20% (2000 bps).
insert into public.commission_rules (scope, rate_bps)
select 'GLOBAL', 2000
where not exists (select 1 from public.commission_rules where scope = 'GLOBAL' and active);

-- ── Cidades atendidas (expansão geográfica configurável) ─────────────────
insert into public.cities (name, state, slug) values
  ('Belo Horizonte', 'MG', 'belo-horizonte-mg'),
  ('Contagem', 'MG', 'contagem-mg'),
  ('Nova Lima', 'MG', 'nova-lima-mg'),
  ('São Paulo', 'SP', 'sao-paulo-sp')
on conflict (slug) do nothing;

-- ── Política de cancelamento (MINUTA — revisão jurídica obrigatória) ─────
insert into public.cancellation_policies (id, name, description, tiers)
values (
  '00000000-0000-4000-8000-000000000c01',
  'Padrão (minuta)',
  'Cancelamento gratuito até 24 horas antes do horário agendado. Com menos de 24 horas, reembolso de 70% do valor pago, para compensar o horário reservado pelo profissional. Exercício do direito de arrependimento previsto no CDC é respeitado. MINUTA sujeita a revisão jurídica.',
  '[{"minHoursBefore": 24, "refundBps": 10000}, {"minHoursBefore": 0, "refundBps": 7000}]'
)
on conflict (id) do nothing;

-- ── Categorias ───────────────────────────────────────────────────────────
insert into public.service_categories (slug, name, description, icon, sort_order, requires_qualification, qualification_note) values
  ('limpeza-residencial', 'Limpeza residencial', 'Limpeza de manutenção para manter a casa em ordem.', 'sparkles', 1, false, null),
  ('limpeza-pesada', 'Limpeza pesada', 'Limpeza detalhada para sujeira acumulada.', 'spray-can', 2, false, null),
  ('limpeza-pos-obra', 'Limpeza pós-obra', 'Remoção de resíduos leves e limpeza fina após reformas.', 'hard-hat', 3, false, null),
  ('pintura-residencial', 'Pintura residencial', 'Pintura de paredes, tetos e pequenos acabamentos.', 'paint-roller', 4, false, null),
  ('pedreiro', 'Serviços de pedreiro', 'Pequenas obras, reparos de alvenaria e acabamentos.', 'brick-wall', 5, false, null),
  ('encanador', 'Encanador', 'Vazamentos, desentupimentos e instalações hidráulicas.', 'droplets', 6, true, 'Exige comprovação de experiência em instalações hidráulicas.'),
  ('eletricista', 'Eletricista', 'Instalações e reparos elétricos residenciais.', 'zap', 7, true, 'Exige comprovação de qualificação técnica em instalações elétricas (ex.: curso NR-10 ou formação técnica).'),
  ('marceneiro', 'Marceneiro', 'Ajustes, reparos e peças sob medida em madeira.', 'hammer', 8, false, null),
  ('montagem-de-moveis', 'Montagem de móveis', 'Montagem e desmontagem de móveis.', 'armchair', 9, false, null),
  ('jardinagem', 'Jardinagem', 'Corte de grama, poda e manutenção de jardins.', 'flower-2', 10, false, null),
  ('pequenos-reparos', 'Pequenos reparos', 'Reparos domésticos rápidos do dia a dia.', 'wrench', 11, false, null),
  ('instalacao-e-manutencao', 'Instalação e manutenção', 'Instalação de itens domésticos: suportes, chuveiros, cortinas e mais.', 'drill', 12, false, null)
on conflict (slug) do nothing;

-- ── Serviços ─────────────────────────────────────────────────────────────
insert into public.services (category_id, slug, name, summary, description, pricing_model, published, cancellation_policy_id, sort_order)
select c.id, s.slug, s.name, s.summary, s.description, s.model::public.pricing_model, true,
       '00000000-0000-4000-8000-000000000c01', s.sort_order
from (values
  ('limpeza-residencial', 'limpeza-basica', 'Limpeza básica', 'Manutenção semanal ou quinzenal da sua casa.', 'Limpeza de manutenção dos ambientes, superfícies acessíveis, parte externa de móveis, pisos e higienização básica de banheiro e cozinha.', 'FIXED', 1),
  ('limpeza-pesada', 'limpeza-pesada', 'Limpeza pesada', 'Para sujeira acumulada e faxinas completas.', 'Limpeza mais detalhada dos ambientes, com remoção de sujeira acumulada em superfícies acessíveis, cozinha e banheiro detalhados e rodapés.', 'FIXED', 1),
  ('limpeza-pos-obra', 'limpeza-pos-obra', 'Limpeza pós-obra', 'Deixe o imóvel pronto para morar depois da reforma.', 'Remoção de resíduos leves de obra, limpeza detalhada de superfícies acessíveis, pisos e esquadrias dentro do escopo contratado.', 'FIXED', 1),
  ('pintura-residencial', 'pintura-paredes-internas', 'Pintura de paredes internas', 'Preço calculado pela área a pintar.', 'Pintura de paredes internas com tinta fornecida pelo cliente. Não inclui correção de trincas, massa corrida ou tratamento de umidade.', 'CALCULATED', 1),
  ('pintura-residencial', 'pintura-orcamento', 'Pintura sob orçamento', 'Fachadas, texturas, tetos e trabalhos especiais.', 'Descreva o que precisa, informe medidas e envie fotos. O profissional envia uma proposta antes de qualquer cobrança.', 'QUOTE', 2),
  ('pedreiro', 'pedreiro-orcamento', 'Reparos de alvenaria', 'Pequenas obras e reparos sob orçamento.', 'Assentamento, reboco, pequenas demolições e reparos. O valor depende de materiais e condições do imóvel, por isso é feito sob orçamento.', 'QUOTE', 1),
  ('encanador', 'encanador-orcamento', 'Reparos hidráulicos', 'Vazamentos, torneiras, sifões e desentupimentos.', 'Descreva o problema e envie fotos. O profissional avalia e envia uma proposta antes de qualquer cobrança.', 'QUOTE', 1),
  ('eletricista', 'eletricista-orcamento', 'Serviços elétricos', 'Tomadas, disjuntores, chuveiros e iluminação.', 'Serviços elétricos residenciais realizados por profissionais com qualificação verificada. Sob orçamento.', 'QUOTE', 1),
  ('marceneiro', 'marceneiro-orcamento', 'Marcenaria sob medida', 'Reparos e peças sob medida.', 'Ajustes de portas e armários, reparos e peças sob medida. Sob orçamento.', 'QUOTE', 1),
  ('montagem-de-moveis', 'montagem-por-hora', 'Montagem de móveis', 'Cobrado por hora de trabalho estimada.', 'Montagem e desmontagem de móveis. Ferramentas fornecidas pelo profissional.', 'CALCULATED', 1),
  ('jardinagem', 'corte-de-grama', 'Corte de grama', 'Preço calculado pela área do gramado.', 'Corte de grama e recolhimento dos resíduos em sacos fornecidos pelo cliente.', 'CALCULATED', 1),
  ('pequenos-reparos', 'reparos-por-hora', 'Pequenos reparos', 'Cobrado por hora de trabalho estimada.', 'Pequenos reparos domésticos: trocar fechaduras, ajustar portas, fixar prateleiras e similares. Materiais por conta do cliente.', 'CALCULATED', 1),
  ('instalacao-e-manutencao', 'instalacao-orcamento', 'Instalação de itens domésticos', 'Suportes de TV, cortinas, varais e mais.', 'Descreva o item a instalar e envie fotos do local. Sob orçamento.', 'QUOTE', 1)
) as s(category_slug, slug, name, summary, description, model, sort_order)
join public.service_categories c on c.slug = s.category_slug
on conflict (slug) do nothing;

-- ── Pacotes de limpeza (preço fixo, DEMONSTRATIVO) ───────────────────────
insert into public.service_packages
  (service_id, slug, name, description, price_cents, duration_minutes, professionals, bedrooms, bathrooms, max_area_m2,
   included_items, excluded_items, supplies_by, supplies_note, conditions, sort_order)
select sv.id, p.slug, p.name, p.description, p.price_cents, p.duration, p.pros, p.bedrooms, p.bathrooms, p.area,
       p.included, p.excluded, p.supplies::public.supplies_by, p.supplies_note, p.conditions, p.sort_order
from (values
  ('limpeza-basica', 'ate-2-quartos', 'Básica — até 2 quartos',
   'Limpeza de manutenção para apartamentos e casas de até 2 quartos e 1 banheiro.',
   18000, 240, 1, 2, 1, 70,
   array['Limpeza de manutenção dos ambientes','Limpeza de superfícies acessíveis','Limpeza externa de móveis','Limpeza de pisos','Higienização básica de banheiro e cozinha','Retirada do lixo doméstico em lixeira disponível'],
   array['Limpeza interna de armários, forno e geladeira (disponível como adicional)','Janelas externas e áreas de risco em altura','Lavagem de roupas e louças em grande volume','Remoção de entulho'],
   'CUSTOMER', 'Produtos de limpeza e equipamentos (vassoura, rodo, balde, panos) fornecidos pelo cliente.',
   'O imóvel deve estar acessível no horário agendado, com água e energia elétrica.', 1),
  ('limpeza-basica', 'ate-3-quartos', 'Básica — até 3 quartos',
   'Limpeza de manutenção para imóveis de até 3 quartos e 2 banheiros.',
   24000, 330, 1, 3, 2, 110,
   array['Limpeza de manutenção dos ambientes','Limpeza de superfícies acessíveis','Limpeza externa de móveis','Limpeza de pisos','Higienização básica de banheiros e cozinha','Retirada do lixo doméstico em lixeira disponível'],
   array['Limpeza interna de armários, forno e geladeira (disponível como adicional)','Janelas externas e áreas de risco em altura','Lavagem de roupas e louças em grande volume','Remoção de entulho'],
   'CUSTOMER', 'Produtos de limpeza e equipamentos fornecidos pelo cliente.',
   'O imóvel deve estar acessível no horário agendado, com água e energia elétrica.', 2),
  ('limpeza-pesada', 'ate-2-quartos', 'Pesada — até 2 quartos',
   'Limpeza detalhada para imóveis de até 2 quartos e 1 banheiro com sujeira acumulada.',
   32000, 420, 1, 2, 1, 70,
   array['Limpeza detalhada dos ambientes','Remoção de sujeira acumulada em superfícies acessíveis','Limpeza detalhada de cozinha e banheiro','Limpeza de rodapés','Limpeza de portas e interruptores'],
   array['Remoção de mofo estrutural ou manchas permanentes','Áreas de risco em altura','Remoção de entulho de obra'],
   'CUSTOMER', 'Produtos de limpeza e equipamentos fornecidos pelo cliente.',
   'Tempo maior de execução. O imóvel deve estar acessível, com água e energia elétrica.', 1),
  ('limpeza-pesada', 'ate-3-quartos', 'Pesada — até 3 quartos',
   'Limpeza detalhada para imóveis de até 3 quartos e 2 banheiros com sujeira acumulada.',
   42000, 480, 2, 3, 2, 110,
   array['Limpeza detalhada dos ambientes','Remoção de sujeira acumulada em superfícies acessíveis','Limpeza detalhada de cozinha e banheiros','Limpeza de rodapés','Limpeza de portas e interruptores'],
   array['Remoção de mofo estrutural ou manchas permanentes','Áreas de risco em altura','Remoção de entulho de obra'],
   'CUSTOMER', 'Produtos de limpeza e equipamentos fornecidos pelo cliente.',
   'Executado por 2 profissionais. O imóvel deve estar acessível, com água e energia elétrica.', 2),
  ('limpeza-pos-obra', 'ate-60-m2', 'Pós-obra — até 60 m²',
   'Limpeza fina após reforma para imóveis de até 60 m².',
   45000, 480, 2, null, null, 60,
   array['Remoção de resíduos leves de obra (pó, respingos de tinta e cimento)','Limpeza detalhada de superfícies acessíveis','Limpeza de pisos','Limpeza de esquadrias e vidros internos acessíveis'],
   array['Remoção de entulho e caçambas','Limpeza de fachadas e áreas em altura','Remoção de manchas que exijam produtos químicos específicos'],
   'PROVIDER', 'O profissional leva equipamentos básicos; produtos específicos podem ser combinados.',
   'A obra deve estar concluída. Pode ser necessária avaliação prévia das condições do imóvel.', 1),
  ('limpeza-pos-obra', 'ate-100-m2', 'Pós-obra — até 100 m²',
   'Limpeza fina após reforma para imóveis de até 100 m².',
   68000, 540, 3, null, null, 100,
   array['Remoção de resíduos leves de obra (pó, respingos de tinta e cimento)','Limpeza detalhada de superfícies acessíveis','Limpeza de pisos','Limpeza de esquadrias e vidros internos acessíveis'],
   array['Remoção de entulho e caçambas','Limpeza de fachadas e áreas em altura','Remoção de manchas que exijam produtos químicos específicos'],
   'PROVIDER', 'O profissional leva equipamentos básicos; produtos específicos podem ser combinados.',
   'A obra deve estar concluída. Pode ser necessária avaliação prévia das condições do imóvel.', 2)
) as p(service_slug, slug, name, description, price_cents, duration, pros, bedrooms, bathrooms, area,
       included, excluded, supplies, supplies_note, conditions, sort_order)
join public.services sv on sv.slug = p.service_slug
on conflict (service_id, slug) do nothing;

-- ── Adicionais (DEMONSTRATIVOS) para os três serviços de limpeza ─────────
insert into public.service_addons (service_id, name, description, pricing, price_cents, unit_label, max_quantity, duration_minutes, sort_order)
select sv.id, a.name, a.description, a.pricing::public.addon_pricing, a.price_cents, a.unit_label, a.max_qty, a.duration, a.sort_order
from public.services sv
cross join (values
  ('Limpeza de forno', 'Limpeza interna do forno convencional.', 'FIXED', 3500, null, 1, 30, 1),
  ('Limpeza de geladeira', 'Limpeza interna da geladeira (deve estar vazia).', 'FIXED', 3500, null, 1, 30, 2),
  ('Janelas acessíveis', 'Limpeza de vidros internos acessíveis, por janela.', 'PER_UNIT', 1000, 'janela', 10, 10, 3),
  ('Armários por dentro', 'Limpeza interna de armários vazios, por armário.', 'PER_UNIT', 1500, 'armário', 10, 15, 4),
  ('Varanda', 'Limpeza de varanda de até 10 m².', 'FIXED', 3000, null, 1, 30, 5),
  ('Imóvel com animais', 'Cuidado extra com pelos e áreas de animais.', 'FIXED', 2000, null, 1, 20, 6),
  ('Banheiro adicional', 'Banheiro além do previsto no pacote.', 'PER_UNIT', 3000, 'banheiro', 3, 40, 7),
  ('Metragem adicional', 'A cada 10 m² além da área do pacote.', 'PER_UNIT', 2500, '10 m²', 10, 30, 8)
) as a(name, description, pricing, price_cents, unit_label, max_qty, duration, sort_order)
where sv.slug in ('limpeza-basica', 'limpeza-pesada', 'limpeza-pos-obra')
  and not exists (select 1 from public.service_addons x where x.service_id = sv.id and x.name = a.name);

-- ── Regras de preço calculado (DEMONSTRATIVAS) ───────────────────────────
insert into public.price_rules (service_id, name, unit, unit_label, base_cents, unit_price_cents, min_quantity, max_quantity, min_total_cents, minutes_per_unit, base_minutes)
select sv.id, r.name, r.unit, r.unit_label, r.base_cents, r.unit_price, r.min_q, r.max_q, r.min_total, r.min_per_unit, r.base_minutes
from (values
  ('pintura-paredes-internas', 'Área de parede', 'M2', 'm² de parede', 0, 2500, 10, 400, 30000, 6, 60),
  ('montagem-por-hora', 'Horas de montagem', 'HOUR', 'hora', 0, 8000, 2, 10, 16000, 60, 0),
  ('corte-de-grama', 'Área de gramado', 'M2', 'm² de gramado', 5000, 300, 20, 2000, 12000, 1, 30),
  ('reparos-por-hora', 'Horas de trabalho', 'HOUR', 'hora', 0, 7000, 1, 8, 9000, 60, 0)
) as r(service_slug, name, unit, unit_label, base_cents, unit_price, min_q, max_q, min_total, min_per_unit, base_minutes)
join public.services sv on sv.slug = r.service_slug
where not exists (select 1 from public.price_rules x where x.service_id = sv.id);
