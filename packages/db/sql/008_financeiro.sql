-- Terceirizei OS — Etapa 8: Financeiro (faturamento + conciliação manual)
-- Acesso interno restrito a ADMIN/GESTOR/FINANCEIRO (OPERACIONAL fica de fora,
-- diferente do padrão "qualquer staff" usado em clientes/documentos).
-- "Atrasada" é calculada em runtime (due_date vencido + status PENDENTE), não
-- é um valor persistido — evita depender de job agendado antes da Etapa 10.

create type invoice_status as enum ('PENDENTE','PAGA','CANCELADA');

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number int not null,
  client_id uuid not null references public.clients(id),
  company_id uuid references public.companies(id),
  status invoice_status not null default 'PENDENTE',
  issue_date timestamptz not null default now(),
  due_date timestamptz not null,
  paid_at timestamptz,
  payment_method text,
  total_amount numeric(12,2) not null,
  notes text,
  created_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);
create index invoices_tenant_id_idx on public.invoices(tenant_id);
create index invoices_client_id_idx on public.invoices(client_id);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  process_id uuid references public.processes(id),
  description text not null,
  amount numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index invoice_items_invoice_id_idx on public.invoice_items(invoice_id);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

create policy "invoices_select_staff" on public.invoices
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','FINANCEIRO')
  );
create policy "invoices_select_self_client" on public.invoices
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
  );
create policy "invoices_manage_staff" on public.invoices
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','FINANCEIRO')
  );

create policy "invoice_items_select_staff" on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','FINANCEIRO')
    )
  );
create policy "invoice_items_select_self_client" on public.invoice_items
  for select using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.client_id = (select client_id from public.users where id = auth.uid())
    )
  );
create policy "invoice_items_manage_staff" on public.invoice_items
  for all using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','FINANCEIRO')
    )
  );
