-- Terceirizei OS — Tarefas recorrentes por cliente (ex.: envio mensal de
-- relatório), inspirado no recurso equivalente do FreelaPRO. Não gera
-- Process — é rastreada nela mesma, com histórico de conclusões.

create type recurrence_frequency as enum ('SEMANAL','MENSAL','TRIMESTRAL','SEMESTRAL','ANUAL');

create table public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.users(id),
  frequency recurrence_frequency not null,
  next_due_at timestamptz not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index recurring_tasks_tenant_id_idx on public.recurring_tasks(tenant_id);
create index recurring_tasks_client_id_idx on public.recurring_tasks(client_id);

create table public.recurring_task_completions (
  id uuid primary key default gen_random_uuid(),
  recurring_task_id uuid not null references public.recurring_tasks(id) on delete cascade,
  completed_at timestamptz not null default now(),
  completed_by_id uuid references public.users(id)
);
create index recurring_task_completions_recurring_task_id_idx
  on public.recurring_task_completions(recurring_task_id);

alter table public.recurring_tasks enable row level security;
alter table public.recurring_task_completions enable row level security;

create policy "recurring_tasks_select_staff" on public.recurring_tasks
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
  );
create policy "recurring_tasks_manage_staff" on public.recurring_tasks
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR')
  );

create policy "recurring_task_completions_select_staff" on public.recurring_task_completions
  for select using (
    exists (
      select 1 from public.recurring_tasks rt
      where rt.id = recurring_task_completions.recurring_task_id
        and rt.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );
create policy "recurring_task_completions_manage_staff" on public.recurring_task_completions
  for all using (
    exists (
      select 1 from public.recurring_tasks rt
      where rt.id = recurring_task_completions.recurring_task_id
        and rt.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );
