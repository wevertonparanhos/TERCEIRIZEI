-- Portal do cliente configuravel por cliente (inspirado no FreelaPRO): mensagem de boas-vindas,
-- cor de destaque e se o cliente pode abrir demandas pelo portal. Sem linha = padrao
-- (sem mensagem, azul da marca, pode abrir demandas).

create table public.client_portal_settings (
  client_id uuid primary key references public.clients(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id),
  welcome_message text,
  accent_color text not null default '#14528D',
  allow_requests boolean not null default true,
  updated_at timestamptz not null default now()
);

create index client_portal_settings_tenant_id_idx on public.client_portal_settings(tenant_id);

alter table public.client_portal_settings enable row level security;

create policy "client_portal_settings_manage_staff" on public.client_portal_settings
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN', 'GESTOR')
  );

create policy "client_portal_settings_select_self_client" on public.client_portal_settings
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );
