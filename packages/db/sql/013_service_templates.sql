-- Terceirizei OS — Modelos de processo: usa o já existente service_types como
-- "modelo" (nome, valor padrão, prazo padrão) e adiciona prioridade/observações
-- padrão + um checklist padrão por tipo de serviço.

alter table public.service_types
  add column default_priority demand_priority,
  add column default_notes text;

create table public.service_checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  service_type_id uuid not null references public.service_types(id) on delete cascade,
  label text not null,
  position int not null,
  created_at timestamptz not null default now(),
  unique (service_type_id, position)
);
create index service_checklist_template_items_service_type_id_idx
  on public.service_checklist_template_items(service_type_id);

alter table public.service_checklist_template_items enable row level security;

create policy "service_checklist_template_items_select_staff" on public.service_checklist_template_items
  for select using (
    exists (
      select 1 from public.service_types st
      where st.id = service_checklist_template_items.service_type_id
        and st.tenant_id = public.current_tenant_id()
    )
  );
create policy "service_checklist_template_items_manage_staff" on public.service_checklist_template_items
  for all using (
    exists (
      select 1 from public.service_types st
      where st.id = service_checklist_template_items.service_type_id
        and st.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR')
    )
  );
