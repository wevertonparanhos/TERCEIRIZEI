-- Etapa 16 (fusão) — Demanda e Processo viram uma coisa só, a pedido
-- explícito do usuário depois de testar o sistema em produção. O model
-- Demand (com seu próprio status/numeração/Kanban implícito via enum) some;
-- Process (que já tinha Kanban configurável, tarefas, checklist, documentos)
-- absorve o único campo que só existia em Demand: requested_deadline.
--
-- Dados reais migrados antes de rodar isto (verificado: 1 demanda, já
-- convertida em processo, sem comentários, 3 entradas de histórico de
-- status — nada foi perdido, só descontinuado o status por enum em favor
-- da etapa do Kanban, que já cobria a mesma necessidade).

alter table public.processes add column requested_deadline timestamptz;

update public.processes p
set requested_deadline = d.requested_deadline
from public.demands d
where p.demand_id = d.id;

alter table public.processes drop column if exists demand_id cascade;

drop table if exists public.demand_comments cascade;
drop table if exists public.demand_status_history cascade;
drop table if exists public.demands cascade;
drop type if exists public.demand_status;
