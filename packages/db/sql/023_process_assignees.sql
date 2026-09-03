-- Terceirizei OS — Múltiplos responsáveis por processo (substitui
-- processes.assigned_user_id, FK única, por uma relação N:N — inspirado no
-- seletor multi-responsável do modal "Nova Tarefa" do FreelaPRO).

create table public.process_assignees (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  user_id uuid not null references public.users(id),
  assigned_at timestamptz not null default now(),
  unique (process_id, user_id)
);
create index process_assignees_user_id_idx on public.process_assignees(user_id);
create index process_assignees_process_id_idx on public.process_assignees(process_id);

alter table public.process_assignees enable row level security;

create policy "process_assignees_select_staff" on public.process_assignees
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_assignees.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );
create policy "process_assignees_manage_staff" on public.process_assignees
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = process_assignees.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );

-- backfill do único responsável que já existia por processo
insert into public.process_assignees (process_id, user_id, assigned_at)
select id, assigned_user_id, updated_at from public.processes where assigned_user_id is not null;

-- essas duas policies dependiam de processes.assigned_user_id (OPERACIONAL só
-- edita processo/tarefa se for o responsável) — recriadas abaixo usando
-- process_assignees no lugar da FK única.
drop policy "processes_update_assignee" on public.processes;
drop policy "tasks_manage_assignee" on public.tasks;

alter table public.processes drop column assigned_user_id;

create policy "processes_update_assignee" on public.processes
  for update using (
    tenant_id = current_tenant_id()
    and current_role_name() = 'OPERACIONAL'
    and exists (
      select 1 from public.process_assignees pa
      where pa.process_id = processes.id and pa.user_id = auth.uid()
    )
  );

create policy "tasks_manage_assignee" on public.tasks
  for all using (
    exists (
      select 1 from public.processes p
      join public.process_assignees pa on pa.process_id = p.id
      where p.id = tasks.process_id
        and p.tenant_id = current_tenant_id()
        and current_role_name() = 'OPERACIONAL'
        and pa.user_id = auth.uid()
    )
  );
