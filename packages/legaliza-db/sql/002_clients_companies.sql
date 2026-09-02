-- LEGALIZA.AI — Fase 2: Cliente, Empresa, Sócios, CNAEs, Endereço

create type public.client_type as enum ('PF', 'PJ');
create type public.company_size as enum ('MEI', 'ME', 'EPP', 'DEMAIS');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  fantasy_name text,
  type public.client_type not null,
  doc text not null,
  email text not null,
  phone text,
  whatsapp text,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc)
);
create index clients_tenant_id_idx on public.clients(tenant_id);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  cnpj text not null,
  legal_name text not null,
  trade_name text,
  legal_nature text,
  company_size public.company_size,
  capital numeric(14,2),
  state_registration text,
  municipal_registration text,
  status text not null default 'ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, cnpj)
);
create index companies_tenant_id_idx on public.companies(tenant_id);
create index companies_client_id_idx on public.companies(client_id);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  cpf text not null,
  qualification text not null,
  participation_percentage numeric(5,2) not null,
  capital_contribution numeric(14,2),
  administrator boolean not null default false,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partners_company_id_idx on public.partners(company_id);

create table public.company_activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cnae text not null,
  description text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index company_activities_company_id_idx on public.company_activities(company_id);

create table public.company_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  ibge_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index company_addresses_company_id_idx on public.company_addresses(company_id);

alter table public.clients enable row level security;
alter table public.companies enable row level security;
alter table public.partners enable row level security;
alter table public.company_activities enable row level security;
alter table public.company_addresses enable row level security;

create policy "clients_select_own_tenant_or_super_admin" on public.clients
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );

create policy "companies_select_own_tenant_or_super_admin" on public.companies
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );

-- partners/company_activities/company_addresses não têm tenant_id direto —
-- isolamento via join com companies (mesma lógica que a Server Action aplica
-- explicitamente; RLS aqui é defesa em profundidade, não a fronteira real).
create policy "partners_select_via_company_tenant" on public.partners
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or exists (
      select 1 from public.companies c
      where c.id = partners.company_id and c.tenant_id = public.current_tenant_id()
    )
  );

create policy "company_activities_select_via_company_tenant" on public.company_activities
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or exists (
      select 1 from public.companies c
      where c.id = company_activities.company_id and c.tenant_id = public.current_tenant_id()
    )
  );

create policy "company_addresses_select_via_company_tenant" on public.company_addresses
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or exists (
      select 1 from public.companies c
      where c.id = company_addresses.company_id and c.tenant_id = public.current_tenant_id()
    )
  );
