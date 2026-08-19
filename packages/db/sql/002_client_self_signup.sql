-- Terceirizei OS — autocadastro de clientes (Portal do Cliente)
-- Substitui o trigger de 001_rls_and_provisioning.sql: agora ele distingue
-- convite de staff (app_metadata definido pelo admin) de autocadastro público
-- (sem app_metadata — assume tenant único e papel CLIENTE, cria o Client).

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  doc text not null,
  email text not null,
  phone text,
  status text not null default 'ativo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, doc),
  unique (tenant_id, email)
);
create index clients_tenant_id_idx on public.clients(tenant_id);

alter table public.users add column client_id uuid references public.clients(id);

alter table public.clients enable row level security;

-- equipe interna (qualquer papel != CLIENTE) vê todos os clientes do próprio tenant
create policy "clients_select_staff" on public.clients
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() <> 'CLIENTE'
  );

-- cliente vê apenas o próprio registro
create policy "clients_select_self" on public.clients
  for select using (
    id = (select client_id from public.users where id = auth.uid())
  );

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_role_id uuid;
  v_client_id uuid;
begin
  v_tenant_id := (new.raw_app_meta_data->>'tenant_id')::uuid;
  v_role_id := (new.raw_app_meta_data->>'role_id')::uuid;

  if v_tenant_id is null then
    -- autocadastro público (portal do cliente): tenant único hoje, papel CLIENTE fixo
    select id into v_tenant_id from public.tenants order by created_at limit 1;
    select id into v_role_id from public.roles where name = 'CLIENTE';

    insert into public.clients (tenant_id, name, doc, email, phone)
    values (
      v_tenant_id,
      coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      new.raw_user_meta_data->>'doc',
      new.email,
      new.raw_user_meta_data->>'phone'
    )
    returning id into v_client_id;
  end if;

  insert into public.users (id, tenant_id, role_id, client_id, name, email)
  values (
    new.id,
    v_tenant_id,
    v_role_id,
    v_client_id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );

  return new;
end;
$$;

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
