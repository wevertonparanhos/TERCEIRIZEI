-- Terceirizei OS — Etapa 3: cadastro completo de clientes, empresas, contatos e tags

create type client_type as enum ('PF', 'PJ');

alter table public.clients
  add column owner_user_id uuid references public.users(id),
  add column fantasy_name text,
  add column type client_type not null default 'PJ',
  add column whatsapp text,
  add column address text,
  add column zip_code text,
  add column city text,
  add column state text,
  add column notes text;

create table public.client_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  role text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index client_contacts_client_id_idx on public.client_contacts(client_id);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  cnpj text not null,
  razao_social text not null,
  nome_fantasia text,
  inscricao_estadual text,
  inscricao_municipal text,
  cnae text,
  natureza_juridica text,
  regime_tributario text,
  address text,
  city text,
  state text,
  opened_at timestamptz,
  status text not null default 'ativa',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, cnpj)
);
create index companies_client_id_idx on public.companies(client_id);
create index companies_tenant_id_idx on public.companies(tenant_id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  label text not null,
  color text not null default '#14528D',
  unique (tenant_id, label)
);

create table public.client_tags (
  client_id uuid not null references public.clients(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (client_id, tag_id)
);

alter table public.client_contacts enable row level security;
alter table public.companies enable row level security;
alter table public.tags enable row level security;
alter table public.client_tags enable row level security;

create policy "client_contacts_all_staff" on public.client_contacts
  for all using (
    exists (
      select 1 from public.clients c
      where c.id = client_contacts.client_id
        and c.tenant_id = public.current_tenant_id()
    )
    and public.current_role_name() <> 'CLIENTE'
  );

create policy "client_contacts_select_self" on public.client_contacts
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );

create policy "companies_all_staff" on public.companies
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() <> 'CLIENTE'
  );

create policy "companies_select_self" on public.companies
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );

create policy "tags_all_staff" on public.tags
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() <> 'CLIENTE'
  );

create policy "tags_select_tenant" on public.tags
  for select using (tenant_id = public.current_tenant_id());

create policy "client_tags_all_staff" on public.client_tags
  for all using (
    exists (
      select 1 from public.clients c
      where c.id = client_tags.client_id
        and c.tenant_id = public.current_tenant_id()
    )
    and public.current_role_name() <> 'CLIENTE'
  );

create policy "client_tags_select_self" on public.client_tags
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );

create policy "clients_insert_staff" on public.clients
  for insert with check (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() <> 'CLIENTE'
  );

create policy "clients_update_staff" on public.clients
  for update using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() <> 'CLIENTE'
  );
