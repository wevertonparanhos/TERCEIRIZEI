-- Terceirizei OS — Etapa 2: RLS multi-tenant + provisionamento automático de usuário
-- Rodar no SQL Editor do Supabase (ou via migration) DEPOIS de `prisma migrate deploy`.

alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;

-- tenant do usuário autenticado
create or replace function public.current_tenant_id()
returns uuid
language sql stable
as $$
  select tenant_id from public.users where id = auth.uid()
$$;

-- papel do usuário autenticado
create or replace function public.current_role_name()
returns text
language sql stable
as $$
  select r.name::text
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid()
$$;

-- tenants: cada usuário só enxerga o próprio tenant
create policy "tenants_select_own" on public.tenants
  for select using (id = public.current_tenant_id());

-- users: só gente do mesmo tenant; edição restrita a ADMIN do próprio tenant
create policy "users_select_same_tenant" on public.users
  for select using (tenant_id = public.current_tenant_id());

create policy "users_update_admin_same_tenant" on public.users
  for update using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() = 'ADMIN'
  );

-- roles/permissions: catálogo global, leitura liberada para qualquer usuário autenticado
create policy "roles_select_authenticated" on public.roles
  for select using (auth.role() = 'authenticated');

create policy "permissions_select_authenticated" on public.permissions
  for select using (auth.role() = 'authenticated');

create policy "role_permissions_select_authenticated" on public.role_permissions
  for select using (auth.role() = 'authenticated');

-- provisionamento: ao criar um usuário em auth.users, cria o perfil correspondente em public.users.
-- tenant_id e role_id chegam via app_metadata, setados pelo admin ao convidar o usuário
-- (ver apps/app/src/lib/rbac.ts) — nunca aceitos de raw_user_meta_data, que o próprio usuário controla.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, tenant_id, role_id, name, email)
  values (
    new.id,
    (new.raw_app_meta_data->>'tenant_id')::uuid,
    (new.raw_app_meta_data->>'role_id')::uuid,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
