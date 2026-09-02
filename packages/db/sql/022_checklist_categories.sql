-- Terceirizei OS — Categoria (agrupamento visual) no checklist de processo e
-- no checklist padrão do modelo de serviço (inspirado no agrupamento
-- equivalente do FreelaPRO, ex.: "Principais"). Nullable — itens sem
-- categoria continuam funcionando exatamente como antes.

alter table public.service_checklist_template_items add column category text;
alter table public.process_checklist_items add column category text;
