-- Terceirizei OS — Etapa 5: Processos/Kanban, Tarefas, Checklist
-- Colunas do Kanban ficam em kanban_stages (tabela por tenant), não em enum fixo —
-- o time pode criar/renomear/reordenar etapas. Seed abaixo cria as 10 colunas
-- padrão sugeridas no briefing, já editáveis a partir daí.

create table public.kanban_stages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  label text not null,
  position int not null,
  color text not null default '#64748B',
  created_at timestamptz not null default now(),
  unique (tenant_id, position)
);

create table public.processes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number int not null,
  demand_id uuid unique references public.demands(id),
  client_id uuid not null references public.clients(id),
  company_id uuid references public.companies(id),
  service_type_id uuid not null references public.service_types(id),
  assigned_user_id uuid references public.users(id),
  stage_id uuid not null references public.kanban_stages(id),
  description text not null,
  priority demand_priority not null default 'MEDIA',
  value numeric(12,2),
  due_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);
create index processes_tenant_id_idx on public.processes(tenant_id);
create index processes_client_id_idx on public.processes(client_id);
create index processes_assigned_user_id_idx on public.processes(assigned_user_id);
create index processes_stage_id_idx on public.processes(stage_id);

create type task_status as enum ('A_FAZER','EM_ANDAMENTO','BLOQUEADA','CONCLUIDA');

create table public.process_stages (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  from_stage_id uuid references public.kanban_stages(id),
  to_stage_id uuid not null references public.kanban_stages(id),
  user_id uuid references public.users(id),
  changed_at timestamptz not null default now()
);
create index process_stages_process_id_idx on public.process_stages(process_id);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.users(id),
  status task_status not null default 'A_FAZER',
  priority demand_priority not null default 'MEDIA',
  due_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_process_id_idx on public.tasks(process_id);

create table public.process_checklist_items (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  label text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
create index process_checklist_items_process_id_idx on public.process_checklist_items(process_id);

create table public.process_tags (
  process_id uuid not null references public.processes(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (process_id, tag_id)
);

alter table public.kanban_stages enable row level security;
alter table public.processes enable row level security;
alter table public.process_stages enable row level security;
alter table public.tasks enable row level security;
alter table public.process_checklist_items enable row level security;
alter table public.process_tags enable row level security;

create policy "kanban_stages_select_tenant" on public.kanban_stages
  for select using (tenant_id = public.current_tenant_id());
create policy "kanban_stages_manage_staff" on public.kanban_stages
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR')
  );

create policy "processes_select_staff" on public.processes
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
  );
create policy "processes_select_self_client" on public.processes
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );
create policy "processes_manage_staff" on public.processes
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR')
  );
create policy "processes_update_assignee" on public.processes
  for update using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() = 'OPERACIONAL'
    and assigned_user_id = auth.uid()
  );

create policy "process_stages_select_staff" on public.process_stages
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_stages.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );

create policy "tasks_select_staff" on public.tasks
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = tasks.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );
create policy "tasks_manage_staff" on public.tasks
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = tasks.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR')
    )
  );
create policy "tasks_manage_assignee" on public.tasks
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = tasks.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() = 'OPERACIONAL'
        and p.assigned_user_id = auth.uid()
    )
  );

create policy "process_checklist_items_select_staff" on public.process_checklist_items
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_checklist_items.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );
create policy "process_checklist_items_manage_staff" on public.process_checklist_items
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = process_checklist_items.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );

create policy "process_tags_select_staff" on public.process_tags
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_tags.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );
create policy "process_tags_manage_staff" on public.process_tags
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = process_tags.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR')
    )
  );

-- colunas padrão do Kanban (sugestão do briefing) — editáveis pelo time depois
insert into public.kanban_stages (tenant_id, label, position, color) values
  ('00000000-0000-0000-0000-000000000001', 'Novo', 1, '#64748B'),
  ('00000000-0000-0000-0000-000000000001', 'Triagem', 2, '#3194BE'),
  ('00000000-0000-0000-0000-000000000001', 'Aguardando Documentos', 3, '#F5A23C'),
  ('00000000-0000-0000-0000-000000000001', 'Documentação Recebida', 4, '#3194BE'),
  ('00000000-0000-0000-0000-000000000001', 'Em Execução', 5, '#14528D'),
  ('00000000-0000-0000-0000-000000000001', 'Aguardando Órgão', 6, '#F5A23C'),
  ('00000000-0000-0000-0000-000000000001', 'Pendência', 7, '#C1442A'),
  ('00000000-0000-0000-0000-000000000001', 'Em Revisão', 8, '#EA7E12'),
  ('00000000-0000-0000-0000-000000000001', 'Concluído', 9, '#1E8E5A'),
  ('00000000-0000-0000-0000-000000000001', 'Cancelado', 10, '#64748B');
