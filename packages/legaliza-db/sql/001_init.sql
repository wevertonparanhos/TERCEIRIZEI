-- LEGALIZA.AI — Fase 1: fundação (Tenant, RBAC, User)
-- Isolamento multi-tenant real na camada de aplicação é via tenant_id explícito
-- (Prisma conecta como role postgres, bypassa RLS) — RLS abaixo é defesa em profundidade,
-- mesmo padrão já validado no Terceirizei OS (packages/db/sql/001 e 007).

create type public.role_name as enum ('SUPER_ADMIN', 'TENANT_ADMIN', 'OPERATOR', 'CLIENT');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  document text,
  email text,
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  name public.role_name not null unique
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  resource text not null,
  action text not null,
  unique (resource, action)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- id igual ao auth.users.id do Supabase; tenant_id nulo só é válido para SUPER_ADMIN
-- (admin da plataforma, acesso cross-tenant) — os outros 3 papéis são sempre escopados.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id),
  role_id uuid not null references public.roles(id),
  name text not null,
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_tenant_id_idx on public.users(tenant_id);

-- Funções auxiliares de RLS — SECURITY DEFINER desde o início (evita a recursão
-- documentada no Terceirizei OS: a policy de select de public.users chamaria
-- current_tenant_id(), que por sua vez consulta public.users de novo).
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid()
$$;

create or replace function public.current_role_name()
returns public.role_name
language sql
stable
security definer
set search_path = public
as $$
  select r.name from public.users u join public.roles r on r.id = u.role_id where u.id = auth.uid()
$$;

grant execute on function public.current_tenant_id() to anon, authenticated, public;
grant execute on function public.current_role_name() to anon, authenticated, public;

alter table public.tenants enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.users enable row level security;

create policy "tenants_select_own_or_super_admin" on public.tenants
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or id = public.current_tenant_id()
  );

create policy "users_select_same_tenant_or_super_admin" on public.users
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );

create policy "roles_select_authenticated" on public.roles
  for select using (auth.role() = 'authenticated');

create policy "permissions_select_authenticated" on public.permissions
  for select using (auth.role() = 'authenticated');

create policy "role_permissions_select_authenticated" on public.role_permissions
  for select using (auth.role() = 'authenticated');
