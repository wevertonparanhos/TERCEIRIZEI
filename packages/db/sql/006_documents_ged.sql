-- Terceirizei OS — Etapa 6: Documentos (GED)
-- Caminho de storage: {tenant_id}/{client_id}/{document_id}/v{version}-{filename}
-- Upload é feito server-side via service role (bypassa as políticas abaixo);
-- as políticas de storage.objects já preparam o acesso direto do portal do
-- cliente (Etapa 7), que vai usar o token do próprio usuário.

create type document_category as enum ('DOCUMENTACAO_CADASTRAL','CONTRATOS','CERTIDOES','DOCUMENTOS_SOCIETARIOS','DOCUMENTOS_FISCAIS','DOCUMENTOS_PESSOAIS','COMPROVANTES','OUTROS');
create type document_request_status as enum ('PENDENTE','RECEBIDO','CANCELADO');

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id),
  process_id uuid references public.processes(id),
  category document_category not null,
  name text not null,
  current_version int not null default 1,
  uploaded_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index documents_tenant_id_idx on public.documents(tenant_id);
create index documents_client_id_idx on public.documents(client_id);
create index documents_process_id_idx on public.documents(process_id);

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
  process_id uuid references public.processes(id),
  document_id uuid references public.documents(id),
  label text not null,
  deadline timestamptz,
  status document_request_status not null default 'PENDENTE',
  notes text,
  requested_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index document_requests_tenant_id_idx on public.document_requests(tenant_id);
create index document_requests_client_id_idx on public.document_requests(client_id);
create index document_requests_process_id_idx on public.document_requests(process_id);

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_requests enable row level security;

create policy "documents_select_staff" on public.documents
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() <> 'CLIENTE'
  );
create policy "documents_select_self_client" on public.documents
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );
create policy "documents_manage_staff" on public.documents
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() <> 'CLIENTE'
  );

create policy "document_versions_select_staff" on public.document_versions
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and d.tenant_id = public.current_tenant_id()
        and public.current_role_name() <> 'CLIENTE'
    )
  );
create policy "document_versions_select_self_client" on public.document_versions
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and d.client_id = (select client_id from public.users where id = auth.uid())
    )
  );
create policy "document_versions_manage_staff" on public.document_versions
  for all using (
    exists (
      select 1 from public.documents d
      where d.id = document_versions.document_id
        and d.tenant_id = public.current_tenant_id()
        and public.current_role_name() <> 'CLIENTE'
    )
  );

create policy "document_requests_select_staff" on public.document_requests
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() <> 'CLIENTE'
  );
create policy "document_requests_select_self_client" on public.document_requests
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );
create policy "document_requests_manage_staff" on public.document_requests
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() <> 'CLIENTE'
  );

insert into storage.buckets (id, name, public) values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_storage_staff_all" on storage.objects
  for all using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and public.current_role_name() <> 'CLIENTE'
  );

create policy "documents_storage_client_select" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = public.current_tenant_id()::text
    and (storage.foldername(name))[2] = (select client_id from public.users where id = auth.uid())::text
  );
