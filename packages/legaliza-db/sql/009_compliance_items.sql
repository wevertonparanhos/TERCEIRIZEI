create type compliance_item_type as enum ('CERTIDAO_NEGATIVA', 'ALVARA', 'CERTIFICADO_DIGITAL');

create table compliance_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  company_id uuid not null references companies(id) on delete cascade,
  type compliance_item_type not null,
  name text not null,
  issued_at timestamptz,
  expires_at timestamptz,
  document_id uuid references documents(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on compliance_items (tenant_id);
create index on compliance_items (company_id);

alter table public.compliance_items enable row level security;

create policy "compliance_items_select_own_tenant_or_super_admin" on public.compliance_items
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );
