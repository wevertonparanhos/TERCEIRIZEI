-- Terceirizei OS — Anotações internas por cliente (inspirado no recurso
-- equivalente do FreelaPRO). Diferente de process_comments: nunca visível
-- no portal do cliente, e pode ser fixada (pinned) no topo.

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_notes_tenant_id_idx on public.client_notes(tenant_id);
create index client_notes_client_id_idx on public.client_notes(client_id);

alter table public.client_notes enable row level security;

create policy "client_notes_select_staff" on public.client_notes
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
  );
create policy "client_notes_manage_staff" on public.client_notes
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
  );
