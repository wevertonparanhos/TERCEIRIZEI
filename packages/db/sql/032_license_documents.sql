-- Controle de vencimento de alvarás, certidões e certificados por cliente
-- (opcionalmente por empresa/CNPJ). Sem job/cron — a tarefa de renovação
-- automática é criada na leitura da lista, mesmo padrão já usado por
-- presença e tarefas recorrentes neste projeto.

create type public.license_document_type as enum ('ALVARA', 'CERTIDAO', 'CERTIFICADO', 'LICENCA', 'OUTRO');

create table public.license_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  client_id uuid not null references public.clients(id) on delete cascade,
  company_id uuid references public.companies(id),
  type license_document_type not null default 'OUTRO',
  name text not null,
  issuing_body text,
  document_number text,
  issued_at timestamptz,
  expires_at timestamptz not null,
  reminder_days_before integer not null default 30,
  responsible_id uuid references public.users(id),
  document_id uuid references public.documents(id),
  auto_task_id uuid unique references public.processes(id),
  notes text,
  created_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index license_documents_tenant_id_idx on public.license_documents(tenant_id);
create index license_documents_client_id_idx on public.license_documents(client_id);
create index license_documents_expires_at_idx on public.license_documents(expires_at);

alter table public.license_documents enable row level security;

create policy "license_documents_select_staff" on public.license_documents
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL', 'FINANCEIRO')
  );

create policy "license_documents_manage_staff" on public.license_documents
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN', 'GESTOR')
  );
