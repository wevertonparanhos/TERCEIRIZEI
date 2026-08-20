-- Terceirizei OS — Etapa 4: Central de Demandas + catálogo de tipos de serviço

create type demand_status as enum ('NOVA','EM_ANALISE','AGUARDANDO_CLIENTE','EM_EXECUCAO','EM_REVISAO','CONCLUIDA','CANCELADA');
create type demand_priority as enum ('BAIXA','MEDIA','ALTA','URGENTE');

create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  default_price numeric(12,2),
  default_deadline_days int,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.demands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number int not null,
  client_id uuid not null references public.clients(id),
  company_id uuid references public.companies(id),
  service_type_id uuid not null references public.service_types(id),
  assigned_user_id uuid references public.users(id),
  description text not null,
  priority demand_priority not null default 'MEDIA',
  status demand_status not null default 'NOVA',
  requested_deadline timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);
create index demands_tenant_id_idx on public.demands(tenant_id);
create index demands_client_id_idx on public.demands(client_id);
create index demands_assigned_user_id_idx on public.demands(assigned_user_id);

create table public.demand_status_history (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.demands(id) on delete cascade,
  from_status demand_status,
  to_status demand_status not null,
  user_id uuid references public.users(id),
  changed_at timestamptz not null default now()
);
create index demand_status_history_demand_id_idx on public.demand_status_history(demand_id);

create table public.tenant_counters (
  tenant_id uuid not null references public.tenants(id),
  key text not null,
  value int not null default 0,
  primary key (tenant_id, key)
);

alter table public.service_types enable row level security;
alter table public.demands enable row level security;
alter table public.demand_status_history enable row level security;
alter table public.tenant_counters enable row level security;

create policy "service_types_select_tenant" on public.service_types
  for select using (tenant_id = public.current_tenant_id());
create policy "service_types_manage_staff" on public.service_types
  for all using (tenant_id = public.current_tenant_id() and public.current_role_name() in ('ADMIN','GESTOR'));

create policy "demands_select_staff" on public.demands
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
  );
create policy "demands_select_self_client" on public.demands
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );
create policy "demands_manage_staff" on public.demands
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR')
  );

create policy "demand_status_history_select_staff" on public.demand_status_history
  for select using (
    exists (
      select 1 from public.demands d
      where d.id = demand_status_history.demand_id
        and d.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );

create policy "tenant_counters_staff" on public.tenant_counters
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR')
  );

-- catálogo real de serviços da Terceirizei (não é dado de demonstração)
insert into public.service_types (tenant_id, name, default_deadline_days) values
  ('00000000-0000-0000-0000-000000000001', 'Abertura de empresa', 10),
  ('00000000-0000-0000-0000-000000000001', 'Alteração contratual', 7),
  ('00000000-0000-0000-0000-000000000001', 'Baixa de empresa', 15),
  ('00000000-0000-0000-0000-000000000001', 'Regularização de CNPJ', 10),
  ('00000000-0000-0000-0000-000000000001', 'Inscrição municipal', 7),
  ('00000000-0000-0000-0000-000000000001', 'Inscrição estadual', 7),
  ('00000000-0000-0000-0000-000000000001', 'Alvará', 15),
  ('00000000-0000-0000-0000-000000000001', 'Certidões', 3),
  ('00000000-0000-0000-0000-000000000001', 'Licitações', 20),
  ('00000000-0000-0000-0000-000000000001', 'Consultoria', 5),
  ('00000000-0000-0000-0000-000000000001', 'BPO', 30),
  ('00000000-0000-0000-0000-000000000001', 'Outros', null);
