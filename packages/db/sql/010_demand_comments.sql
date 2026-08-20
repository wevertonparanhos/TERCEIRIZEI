-- Terceirizei OS — Etapa 15 (parte 1): comentários em demanda
-- Visível/editável tanto pela equipe (ADMIN/GESTOR/OPERACIONAL) quanto pelo
-- cliente dono da demanda — a mesma tabela serve os dois lados.

create table public.demand_comments (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index demand_comments_demand_id_idx on public.demand_comments(demand_id);

alter table public.demand_comments enable row level security;

create policy "demand_comments_select_staff" on public.demand_comments
  for select using (
    exists (
      select 1 from public.demands d
      where d.id = demand_comments.demand_id
        and d.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );
create policy "demand_comments_select_self_client" on public.demand_comments
  for select using (
    exists (
      select 1 from public.demands d
      where d.id = demand_comments.demand_id
        and d.client_id = (select client_id from public.users where id = auth.uid())
    )
  );
create policy "demand_comments_insert_staff" on public.demand_comments
  for insert with check (
    exists (
      select 1 from public.demands d
      where d.id = demand_comments.demand_id
        and d.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );
create policy "demand_comments_insert_self_client" on public.demand_comments
  for insert with check (
    exists (
      select 1 from public.demands d
      where d.id = demand_comments.demand_id
        and d.client_id = (select client_id from public.users where id = auth.uid())
    )
  );
