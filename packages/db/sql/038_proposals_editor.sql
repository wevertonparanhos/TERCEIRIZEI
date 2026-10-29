-- Propostas no padrao do FreelaPRO: editor em 4 etapas (apresentacao, escopo e investimento,
-- condicoes, acabamento), modelos de proposta totalmente editaveis, blocos de texto
-- reutilizaveis e o status CANCELADA.

-- 1) Status "Cancelada" (a proposta some do portal do cliente, mas fica no historico).
alter type proposal_status add value if not exists 'CANCELADA';

-- 2) Conteudo novo da proposta. Cliente passa a ser opcional enquanto e rascunho.
alter table public.proposals alter column client_id drop not null;

alter table public.proposals
  add column intro text,
  add column start_immediately boolean not null default true,
  add column start_date date,
  add column duration text,
  add column payment_structure text not null default 'AVISTA',
  add column installments int,
  add column payment_methods text[] not null default '{}',
  add column valid_days int not null default 15,
  add column discount numeric(12,2) not null default 0,
  add column cover_url text,
  add column hide_client_contact boolean not null default false,
  add column extra_sections jsonb not null default '[]'::jsonb,
  add column canceled_at timestamptz,
  add column cancel_reason text;

alter table public.proposal_items
  add column detail text,
  add column position int not null default 0;

-- 3) Modelos de proposta: o conteudo inteiro fica em "data" (mesma forma do editor).
create table public.proposal_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  created_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proposal_templates_tenant_id_idx on public.proposal_templates(tenant_id);

-- 4) Blocos de texto reutilizaveis (apresentacao, "o que nao esta incluso", FAQ...).
create table public.proposal_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  name text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index proposal_blocks_tenant_id_idx on public.proposal_blocks(tenant_id);

alter table public.proposal_templates enable row level security;
alter table public.proposal_blocks enable row level security;

create policy "proposal_templates_select_staff" on public.proposal_templates
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','FINANCEIRO')
  );
create policy "proposal_templates_manage_staff" on public.proposal_templates
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR')
  );

create policy "proposal_blocks_select_staff" on public.proposal_blocks
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','FINANCEIRO')
  );
create policy "proposal_blocks_manage_staff" on public.proposal_blocks
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR')
  );
