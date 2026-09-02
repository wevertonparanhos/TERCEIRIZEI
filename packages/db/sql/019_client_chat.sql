-- Terceirizei OS — Chat direto com o cliente (inspirado no recurso
-- equivalente do FreelaPRO). Geral por cliente, não vinculado a um processo
-- específico (diferente de process_comments). Sem tempo real: atualiza por
-- reload, mesmo padrão já usado nos comentários de processo.

create table public.client_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index client_messages_tenant_id_idx on public.client_messages(tenant_id);
create index client_messages_client_id_idx on public.client_messages(client_id);

create table public.client_message_reads (
  client_id uuid not null references public.clients(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null,
  primary key (client_id, user_id)
);
create index client_message_reads_user_id_idx on public.client_message_reads(user_id);

alter table public.client_messages enable row level security;
alter table public.client_message_reads enable row level security;

create policy "client_messages_select_staff" on public.client_messages
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
  );
create policy "client_messages_select_self_client" on public.client_messages
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );
create policy "client_messages_insert_staff" on public.client_messages
  for insert with check (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
  );
create policy "client_messages_insert_self_client" on public.client_messages
  for insert with check (
    client_id = (select client_id from public.users where id = auth.uid())
  );

create policy "client_message_reads_own" on public.client_message_reads
  for all using (user_id = auth.uid());
