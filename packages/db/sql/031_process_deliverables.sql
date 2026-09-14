-- Entregáveis por tarefa (texto, link ou arquivo já enviado) com aprovação do
-- cliente pelo portal — inspirado na aba "Entregáveis" do FreelaPRO. Reaproveita
-- document_approval_status (já existente) pro status de aprovação.

create type public.deliverable_type as enum ('TEXTO', 'LINK', 'ARQUIVO');

create table public.process_deliverables (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  type deliverable_type not null,
  title text not null,
  content text,
  url text,
  document_id uuid references public.documents(id),
  approval_status document_approval_status not null default 'PENDENTE',
  approval_note text,
  created_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create index process_deliverables_process_id_idx on public.process_deliverables(process_id);

alter table public.process_deliverables enable row level security;

create policy process_deliverables_select_staff on public.process_deliverables
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_deliverables.process_id
        and p.tenant_id = current_tenant_id()
        and current_role_name() <> 'CLIENTE'
    )
  );

create policy process_deliverables_manage_staff on public.process_deliverables
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = process_deliverables.process_id
        and p.tenant_id = current_tenant_id()
        and current_role_name() <> 'CLIENTE'
    )
  );

create policy process_deliverables_select_self_client on public.process_deliverables
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_deliverables.process_id
        and p.client_id = (select u.client_id from public.users u where u.id = auth.uid())
    )
  );

create policy process_deliverables_update_approval_self_client on public.process_deliverables
  for update using (
    exists (
      select 1 from public.processes p
      where p.id = process_deliverables.process_id
        and p.client_id = (select u.client_id from public.users u where u.id = auth.uid())
    )
  );
