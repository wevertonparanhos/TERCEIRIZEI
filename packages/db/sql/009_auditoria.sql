-- Terceirizei OS — Etapa 11: Segurança/Auditoria
-- Trilha de auditoria: escrita explícita a partir das Server Actions mais
-- sensíveis (não um interceptor genérico). Leitura restrita a ADMIN.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  user_id uuid references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_tenant_id_created_at_idx on public.audit_logs(tenant_id, created_at);
create index audit_logs_entity_type_entity_id_idx on public.audit_logs(entity_type, entity_id);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin" on public.audit_logs
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() = 'ADMIN'
  );
