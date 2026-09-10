-- Áreas de Trabalho (quadros Kanban independentes por tenant) + Pendência por tarefa.
-- Pedido do usuário após ver o exemplo do FreelaPRO: "quero incluir a possibilidade
-- de criar mais áreas de trabalho" + "quero um campo de pendência em cada tarefa".
-- Áreas são livres (sem vínculo fixo com Tipo de Serviço) — o usuário cria quantas
-- quiser e escolhe manualmente em qual área cada processo entra. Todo processo e
-- etapa existente hoje é migrado automaticamente para uma área "Principal" criada
-- por tenant, sem perda de dados.

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  position int not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, position)
);

alter table public.workspaces enable row level security;

create policy workspaces_select_tenant on public.workspaces
  for select using (tenant_id = current_tenant_id());

create policy workspaces_manage_staff on public.workspaces
  for all using (tenant_id = current_tenant_id() and current_role_name() in ('ADMIN', 'GESTOR'));

-- Área "Principal" pra cada tenant existente.
insert into public.workspaces (tenant_id, name, position)
select id, 'Principal', 1 from public.tenants;

-- kanban_stages passa a pertencer a uma área de trabalho (não mais direto ao tenant).
alter table public.kanban_stages add column workspace_id uuid references public.workspaces(id);

update public.kanban_stages ks
set workspace_id = w.id
from public.workspaces w
where w.tenant_id = ks.tenant_id and w.position = 1;

alter table public.kanban_stages alter column workspace_id set not null;
alter table public.kanban_stages drop constraint kanban_stages_tenant_id_position_key;
alter table public.kanban_stages add constraint kanban_stages_workspace_id_position_key unique (workspace_id, position);

-- processes passa a pertencer a uma área de trabalho.
alter table public.processes add column workspace_id uuid references public.workspaces(id);

update public.processes p
set workspace_id = w.id
from public.workspaces w
where w.tenant_id = p.tenant_id and w.position = 1;

alter table public.processes alter column workspace_id set not null;
create index processes_workspace_id_idx on public.processes(workspace_id);

-- Pendência por tarefa — mesmo padrão do process_impediments, escopado à tarefa.
create table public.task_impediments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  created_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_id uuid references public.users(id)
);

create index task_impediments_task_id_idx on public.task_impediments(task_id);

alter table public.task_impediments enable row level security;

create policy task_impediments_select_staff on public.task_impediments
  for select using (
    exists (
      select 1 from public.tasks t
      join public.processes p on p.id = t.process_id
      where t.id = task_impediments.task_id
        and p.tenant_id = current_tenant_id()
        and current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL')
    )
  );

create policy task_impediments_manage_staff on public.task_impediments
  for all using (
    exists (
      select 1 from public.tasks t
      join public.processes p on p.id = t.process_id
      where t.id = task_impediments.task_id
        and p.tenant_id = current_tenant_id()
        and current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL')
    )
  );
