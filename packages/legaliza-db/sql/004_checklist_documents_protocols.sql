-- LEGALIZA.AI — Fase 4: Checklist, Documentos (GED) e Protocolos
-- Caminho de storage: {tenant_id}/{client_id}/{document_id}/v{version}-{filename}
-- Upload é feito server-side via service role (bypassa as policies abaixo);
-- as policies de storage.objects já preparam o acesso direto do portal do
-- cliente (fase futura), que vai usar o token do próprio usuário.

create type public.document_category as enum ('DOCUMENTACAO_CADASTRAL', 'CONTRATOS', 'CERTIDOES', 'DOCUMENTOS_SOCIETARIOS', 'DOCUMENTOS_FISCAIS', 'DOCUMENTOS_PESSOAIS', 'COMPROVANTES', 'OUTROS');
create type public.document_request_status as enum ('PENDENTE', 'RECEBIDO', 'CANCELADO');
create type public.government_sphere as enum ('FEDERAL', 'ESTADUAL', 'MUNICIPAL');
create type public.protocol_status as enum ('SUBMITTED', 'UNDER_ANALYSIS', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  label text not null,
  required boolean not null default true,
  done boolean not null default false,
  document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checklist_items_process_id_idx on public.checklist_items(process_id);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id),
  process_id uuid not null references public.processes(id) on delete cascade,
  category public.document_category not null,
  name text not null,
  current_version int not null default 1,
  uploaded_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_tenant_id_idx on public.documents(tenant_id);
create index documents_client_id_idx on public.documents(client_id);
create index documents_process_id_idx on public.documents(process_id);

alter table public.checklist_items add constraint checklist_items_document_id_fkey foreign key (document_id) references public.documents(id);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version int not null,
  storage_path text not null,
  file_name text not null,
  size_bytes int not null,
  mime_type text not null,
  uploaded_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table public.document_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id),
  process_id uuid not null references public.processes(id) on delete cascade,
  document_id uuid references public.documents(id),
  label text not null,
  deadline timestamptz,
  status public.document_request_status not null default 'PENDENTE',
  notes text,
  requested_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index document_requests_tenant_id_idx on public.document_requests(tenant_id);
create index document_requests_client_id_idx on public.document_requests(client_id);
create index document_requests_process_id_idx on public.document_requests(process_id);

create table public.government_agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sphere public.government_sphere not null,
  state text,
  active boolean not null default true
);

create table public.protocols (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  process_id uuid not null references public.processes(id) on delete cascade,
  process_step_id uuid references public.process_steps(id),
  government_agency_id uuid not null references public.government_agencies(id),
  protocol_number text not null,
  submitted_at timestamptz not null default now(),
  status public.protocol_status not null default 'SUBMITTED',
  url text,
  document_id uuid references public.documents(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index protocols_tenant_id_idx on public.protocols(tenant_id);
create index protocols_process_id_idx on public.protocols(process_id);

alter table public.checklist_items enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_requests enable row level security;
alter table public.government_agencies enable row level security;
alter table public.protocols enable row level security;

create policy "checklist_items_select_via_process_tenant" on public.checklist_items
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or exists (
      select 1 from public.processes p where p.id = checklist_items.process_id and p.tenant_id = public.current_tenant_id()
    )
  );

create policy "documents_select_own_tenant_or_super_admin" on public.documents
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );

create policy "document_versions_select_via_document_tenant" on public.document_versions
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or exists (
      select 1 from public.documents d where d.id = document_versions.document_id and d.tenant_id = public.current_tenant_id()
    )
  );

create policy "document_requests_select_own_tenant_or_super_admin" on public.document_requests
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );

-- Catálogo global de referência — leitura liberada pra qualquer autenticado.
create policy "government_agencies_select_authenticated" on public.government_agencies
  for select using (auth.role() = 'authenticated');

create policy "protocols_select_own_tenant_or_super_admin" on public.protocols
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );

-- Supabase Storage
insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Só staff (TENANT_ADMIN/OPERATOR/SUPER_ADMIN) por enquanto — sem Portal do
-- Cliente ainda, então não existe policy de CLIENT aqui (User.clientId não
-- existe no schema ainda; criar essa policy sem isso deixaria qualquer
-- usuário do tenant ler tudo, não só o que é do próprio cliente).
create policy "documents_storage_staff_all" on storage.objects
  for all using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_role_name() <> 'CLIENT'
  );
