-- LEGALIZA.AI — Fase 3: Processo, Workflow e Motor de Regras

create type public.process_type as enum ('OPENING', 'AMENDMENT', 'TRANSFORMATION', 'CLOSURE');
create type public.process_status as enum ('DRAFT', 'NEW', 'TRIAGE', 'WAITING_DOCUMENTS', 'READY', 'IN_PROGRESS', 'WAITING_CLIENT', 'WAITING_GOVERNMENT', 'PENDING', 'COMPLETED', 'CANCELLED');
create type public.process_step_status as enum ('PENDING', 'READY', 'IN_PROGRESS', 'WAITING', 'COMPLETED', 'BLOCKED', 'CANCELLED');
create type public.process_priority as enum ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  process_type public.process_type not null,
  state text,
  legal_nature text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workflows_tenant_id_idx on public.workflows(tenant_id);

create table public.workflow_steps (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  name text not null,
  description text,
  "order" int not null,
  estimated_days int,
  responsible_role text,
  agency_name text,
  requires_document boolean not null default false,
  requires_protocol boolean not null default false,
  is_automated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workflow_steps_workflow_id_idx on public.workflow_steps(workflow_id);

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  process_type public.process_type not null,
  state text,
  legal_nature text,
  workflow_id uuid not null references public.workflows(id),
  priority int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rules_tenant_id_idx on public.rules(tenant_id);

create table public.processes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id),
  company_id uuid references public.companies(id),
  workflow_id uuid references public.workflows(id),
  type public.process_type not null,
  status public.process_status not null default 'NEW',
  priority public.process_priority not null default 'MEDIA',
  responsible_user_id uuid references public.users(id),
  state text not null,
  municipality text not null,
  started_at timestamptz not null default now(),
  expected_completion_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index processes_tenant_id_idx on public.processes(tenant_id);
create index processes_client_id_idx on public.processes(client_id);

create table public.process_steps (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  workflow_step_id uuid references public.workflow_steps(id),
  name text not null,
  description text,
  status public.process_step_status not null default 'PENDING',
  "order" int not null,
  responsible_user_id uuid references public.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  due_date timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index process_steps_process_id_idx on public.process_steps(process_id);

alter table public.workflows enable row level security;
alter table public.workflow_steps enable row level security;
alter table public.rules enable row level security;
alter table public.processes enable row level security;
alter table public.process_steps enable row level security;

create policy "workflows_select_own_tenant_or_super_admin" on public.workflows
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );

create policy "workflow_steps_select_via_workflow_tenant" on public.workflow_steps
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or exists (
      select 1 from public.workflows w
      where w.id = workflow_steps.workflow_id and w.tenant_id = public.current_tenant_id()
    )
  );

create policy "rules_select_own_tenant_or_super_admin" on public.rules
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );

create policy "processes_select_own_tenant_or_super_admin" on public.processes
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );

create policy "process_steps_select_via_process_tenant" on public.process_steps
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or exists (
      select 1 from public.processes p
      where p.id = process_steps.process_id and p.tenant_id = public.current_tenant_id()
    )
  );
