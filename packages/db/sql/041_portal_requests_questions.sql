-- Portal do cliente no padrao do FreelaPRO, parte 2:
--  1) Pedidos do cliente passam por uma caixa de revisao (importar como tarefa ou recusar);
--  2) perguntas personalizadas no formulario de pedido de cada cliente;
--  3) controles por cliente: exigir revisao dos pedidos e permitir aprovacao de entregas.

alter table public.client_portal_settings
  add column review_requests boolean not null default true,
  add column allow_approvals boolean not null default true;

create table public.portal_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  company_id uuid references public.companies(id),
  service_type_id uuid not null references public.service_types(id),
  description text not null,
  priority demand_priority not null default 'MEDIA',
  requested_deadline timestamptz,
  answers jsonb not null default '[]'::jsonb,
  status text not null default 'PENDENTE' check (status in ('PENDENTE', 'IMPORTADO', 'RECUSADO')),
  process_id uuid references public.processes(id) on delete set null,
  review_note text,
  reviewed_by_id uuid references public.users(id),
  reviewed_at timestamptz,
  created_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index portal_requests_tenant_status_idx on public.portal_requests(tenant_id, status);
create index portal_requests_client_id_idx on public.portal_requests(client_id);

-- Anexos enviados junto com o pedido (viram anexos da tarefa quando o pedido e importado).
alter table public.documents
  add column portal_request_id uuid references public.portal_requests(id) on delete set null;

create index documents_portal_request_id_idx on public.documents(portal_request_id);

create table public.client_portal_questions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  label text not null,
  kind text not null default 'TEXTO_LONGO' check (kind in ('TEXTO', 'TEXTO_LONGO')),
  required boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index client_portal_questions_client_id_idx on public.client_portal_questions(client_id);

alter table public.portal_requests enable row level security;
alter table public.client_portal_questions enable row level security;

create policy "portal_requests_staff" on public.portal_requests
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL')
  );
create policy "portal_requests_client_own_select" on public.portal_requests
  for select using (client_id = (select client_id from public.users where id = auth.uid()));
create policy "portal_requests_client_own_insert" on public.portal_requests
  for insert with check (client_id = (select client_id from public.users where id = auth.uid()));

create policy "client_portal_questions_manage_staff" on public.client_portal_questions
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN', 'GESTOR')
  );
create policy "client_portal_questions_client_own_select" on public.client_portal_questions
  for select using (client_id = (select client_id from public.users where id = auth.uid()));
