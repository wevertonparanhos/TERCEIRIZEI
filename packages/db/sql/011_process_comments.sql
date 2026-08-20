-- Terceirizei OS — Etapa 16: comentários em processo (mesma ideia da Etapa 15
-- para demandas), integrado ao Portal do Cliente.

create table public.process_comments (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index process_comments_process_id_idx on public.process_comments(process_id);

alter table public.process_comments enable row level security;

create policy "process_comments_select_staff" on public.process_comments
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_comments.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );
create policy "process_comments_select_self_client" on public.process_comments
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_comments.process_id
        and p.client_id = (select client_id from public.users where id = auth.uid())
    )
  );
create policy "process_comments_insert_staff" on public.process_comments
  for insert with check (
    exists (
      select 1 from public.processes p
      where p.id = process_comments.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );
create policy "process_comments_insert_self_client" on public.process_comments
  for insert with check (
    exists (
      select 1 from public.processes p
      where p.id = process_comments.process_id
        and p.client_id = (select client_id from public.users where id = auth.uid())
    )
  );
