-- Tipos de solicitacao (etiquetas) divididos por area de trabalho, como as Categorias por quadro do FreelaPRO.
-- Cada tipo passa a pertencer a UMA area. Um tipo que hoje e usado em tarefas de areas diferentes ganha uma
-- copia (mesmo nome) em cada area, e as tarefas passam a apontar para a copia da propria area: nada se perde.

alter table public.service_types
  add column workspace_id uuid references public.workspaces(id) on delete cascade;

-- O mesmo nome agora pode existir em areas diferentes.
alter table public.service_types drop constraint if exists service_types_tenant_id_name_key;

-- 1) Cada tipo vai para a area onde mais e usado (empate: a primeira area do quadro).
with pairs as (
  select pst.process_id, pst.service_type_id from public.process_service_types pst
  union
  select p.id, p.service_type_id from public.processes p
),
usage as (
  select pr.service_type_id as type_id, p.workspace_id, count(*) as n, w.position
  from pairs pr
  join public.processes p on p.id = pr.process_id
  join public.workspaces w on w.id = p.workspace_id
  group by pr.service_type_id, p.workspace_id, w.position
),
best as (
  select distinct on (type_id) type_id, workspace_id
  from usage
  order by type_id, n desc, position asc
)
update public.service_types s
set workspace_id = b.workspace_id
from best b
where b.type_id = s.id;

-- Tipos sem nenhuma tarefa ficam na primeira area.
update public.service_types s
set workspace_id = (
  select w.id from public.workspaces w where w.tenant_id = s.tenant_id order by w.position limit 1
)
where s.workspace_id is null;

create unique index service_types_tenant_id_workspace_id_name_key
  on public.service_types (tenant_id, workspace_id, name);
create index service_types_workspace_id_idx on public.service_types (workspace_id);

-- 2) Copias dos tipos usados em tarefas de outra area.
insert into public.service_types (tenant_id, name, active, workspace_id)
select distinct s.tenant_id, s.name, s.active, p.workspace_id
from public.process_service_types pst
join public.processes p on p.id = pst.process_id
join public.service_types s on s.id = pst.service_type_id
where s.workspace_id <> p.workspace_id
on conflict do nothing;

insert into public.service_types (tenant_id, name, active, workspace_id)
select distinct s.tenant_id, s.name, s.active, p.workspace_id
from public.processes p
join public.service_types s on s.id = p.service_type_id
where s.workspace_id <> p.workspace_id
on conflict do nothing;

-- 3) As tarefas passam a apontar para o tipo da propria area.
update public.process_service_types pst
set service_type_id = c.id
from public.processes p, public.service_types s, public.service_types c
where p.id = pst.process_id
  and s.id = pst.service_type_id
  and s.workspace_id <> p.workspace_id
  and c.tenant_id = s.tenant_id
  and c.name = s.name
  and c.workspace_id = p.workspace_id;

update public.processes p
set service_type_id = c.id
from public.service_types s, public.service_types c
where s.id = p.service_type_id
  and s.workspace_id <> p.workspace_id
  and c.tenant_id = s.tenant_id
  and c.name = s.name
  and c.workspace_id = p.workspace_id;

alter table public.service_types alter column workspace_id set not null;
