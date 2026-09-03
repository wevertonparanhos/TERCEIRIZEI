-- LEGALIZA.AI — Fase 5: Auditoria
-- logAudit() nunca derruba a ação que chamou — falha de log fica só no
-- console, não propaga (mesmo padrão do Terceirizei OS).

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid not null references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_tenant_id_idx on public.audit_logs(tenant_id);
create index audit_logs_entity_type_idx on public.audit_logs(entity_type);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_own_tenant_or_super_admin" on public.audit_logs
  for select using (
    public.current_role_name() = 'SUPER_ADMIN' or tenant_id = public.current_tenant_id()
  );
