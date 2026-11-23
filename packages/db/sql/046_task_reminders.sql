-- Lembretes para nao esquecer de verificar processos:
--  1) lembrete por tarefa: data + nota curta, com "feito" e "adiar";
--  2) alerta automatico por etapa: a etapa pode "cobrar" tarefas paradas nela ha mais de N dias.

create table public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  process_id uuid not null references public.processes(id) on delete cascade,
  remind_on date not null,
  note text not null default '',
  created_by_id uuid not null references public.users(id),
  done_at timestamptz,
  done_by_id uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index task_reminders_process_id_idx on public.task_reminders(process_id);
create index task_reminders_open_idx on public.task_reminders(tenant_id, remind_on) where done_at is null;

-- Etapa que cobra tarefas paradas: "se ficar mais de N dias nesta etapa, avise".
alter table public.kanban_stages
  add column alert_after_days int check (alert_after_days is null or (alert_after_days between 1 and 365));

-- "Adiar" o alerta de etapa parada de uma tarefa especifica.
alter table public.processes
  add column stage_alert_snoozed_until date;

alter table public.task_reminders enable row level security;

create policy "task_reminders_staff" on public.task_reminders
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL')
  );
