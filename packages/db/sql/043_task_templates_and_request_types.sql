-- Modelos de tarefa x Tipos de solicitacao passam a ser coisas diferentes:
--  * Tipo de solicitacao (service_types) = so uma etiqueta que identifica o servico; a tarefa pode ter mais de um.
--  * Modelo de tarefa (task_templates) = tarefa generica pre-pronta (valor, prazo, prioridade, anotacoes e checklist).
-- Os 11 tipos que tinham valor/prazo/prioridade padrao viram modelos (com o mesmo nome) e os tipos ficam so com o nome.

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  default_price numeric(12, 2),
  default_deadline_days int,
  default_priority demand_priority,
  default_notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.task_template_checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  label text not null,
  position int not null,
  created_at timestamptz not null default now(),
  unique (template_id, position)
);

-- Todas as etiquetas (tipos) de uma tarefa. process.service_type_id continua guardando a principal (a primeira).
create table public.process_service_types (
  process_id uuid not null references public.processes(id) on delete cascade,
  service_type_id uuid not null references public.service_types(id) on delete cascade,
  primary key (process_id, service_type_id)
);

create index process_service_types_type_idx on public.process_service_types(service_type_id);

-- Modelos a partir dos tipos que tinham padrao (valor, prazo, prioridade, anotacoes ou checklist).
insert into public.task_templates (tenant_id, name, default_price, default_deadline_days, default_priority, default_notes, active)
select s.tenant_id, s.name, s.default_price, s.default_deadline_days, s.default_priority, s.default_notes, s.active
from public.service_types s
where s.default_price is not null
   or s.default_deadline_days is not null
   or s.default_priority is not null
   or coalesce(s.default_notes, '') <> ''
   or exists (select 1 from public.service_checklist_template_items i where i.service_type_id = s.id);

insert into public.task_template_checklist_items (template_id, label, position)
select t.id, i.label, i.position
from public.service_checklist_template_items i
join public.service_types s on s.id = i.service_type_id
join public.task_templates t on t.tenant_id = s.tenant_id and t.name = s.name;

-- Os tipos viram so etiquetas.
update public.service_types
set default_price = null, default_deadline_days = null, default_priority = null, default_notes = null;

-- Etiqueta atual de cada tarefa existente.
insert into public.process_service_types (process_id, service_type_id)
select id, service_type_id from public.processes where service_type_id is not null
on conflict do nothing;

alter table public.task_templates enable row level security;
alter table public.task_template_checklist_items enable row level security;
alter table public.process_service_types enable row level security;

create policy "task_templates_manage_staff" on public.task_templates
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN', 'GESTOR')
  );
create policy "task_templates_select_staff" on public.task_templates
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL', 'FINANCEIRO')
  );

create policy "task_template_items_manage_staff" on public.task_template_checklist_items
  for all using (
    exists (
      select 1 from public.task_templates t
      where t.id = task_template_checklist_items.template_id
        and t.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN', 'GESTOR')
    )
  );
create policy "task_template_items_select_staff" on public.task_template_checklist_items
  for select using (
    exists (
      select 1 from public.task_templates t
      where t.id = task_template_checklist_items.template_id
        and t.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL', 'FINANCEIRO')
    )
  );

create policy "process_service_types_manage_staff" on public.process_service_types
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = process_service_types.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN', 'GESTOR')
    )
  );
create policy "process_service_types_select_staff" on public.process_service_types
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_service_types.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL', 'FINANCEIRO')
    )
  );

-- A etiqueta principal da tarefa (processes.service_type_id) sempre existe tambem na lista de etiquetas,
-- inclusive para tarefas criadas por importacao ou rotinas que nao conhecem a tabela nova.
create or replace function public.ensure_primary_service_type_tag()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.service_type_id is not null then
    insert into public.process_service_types (process_id, service_type_id)
    values (new.id, new.service_type_id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger processes_primary_service_type_tag
  after insert or update of service_type_id on public.processes
  for each row execute function public.ensure_primary_service_type_tag();
