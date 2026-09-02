-- Terceirizei OS — Impedimentos de processo (inspirado no recurso equivalente
-- do FreelaPRO). Bloqueio interno da equipe (ex.: "aguardando OK do
-- cliente") — só staff vê, não é exposto no portal do cliente nesta etapa
-- (diferente de process_comments, que o cliente também lê/posta).

create table public.process_impediments (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  title text not null,
  created_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by_id uuid references public.users(id)
);
create index process_impediments_process_id_idx on public.process_impediments(process_id);

alter table public.process_impediments enable row level security;

create policy "process_impediments_select_staff" on public.process_impediments
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_impediments.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );
create policy "process_impediments_manage_staff" on public.process_impediments
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = process_impediments.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );
