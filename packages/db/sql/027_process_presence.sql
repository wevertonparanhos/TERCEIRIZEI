-- Terceirizei OS — "Estou aqui": marca manual de presença no processo, pra
-- evitar duas pessoas trabalhando na mesma coisa sem necessidade. Fecha o
-- último item do backlog do modal "Nova Tarefa". Só staff, nunca exposto no
-- portal. Sem job/cron: "ativo" é calculado a cada leitura (lastSeenAt
-- recente) — a marca expira sozinha se a pessoa esquecer de sair.

create table public.process_presence (
  process_id uuid not null references public.processes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  last_seen_at timestamptz not null,
  primary key (process_id, user_id)
);
create index process_presence_process_id_idx on public.process_presence(process_id);

alter table public.process_presence enable row level security;

create policy "process_presence_select_staff" on public.process_presence
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_presence.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );
create policy "process_presence_manage_staff" on public.process_presence
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = process_presence.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );
