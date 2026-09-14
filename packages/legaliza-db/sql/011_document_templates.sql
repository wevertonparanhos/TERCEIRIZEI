create table document_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  category document_category not null default 'OUTROS',
  description text,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on document_templates (tenant_id);

alter table document_templates enable row level security;

create policy "document_templates_select_staff" on document_templates
  for select using (
    current_role_name() = 'SUPER_ADMIN' or (tenant_id = current_tenant_id() and current_role_name() <> 'CLIENT')
  );
