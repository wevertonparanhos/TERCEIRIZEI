-- Terceirizei OS — Pagamentos em parcelas por processo (substitui
-- processes.value/payment_due_date/paid_at, valor único, por uma lista de
-- parcelas — inspirado no seletor de pagamento do modal "Nova Tarefa" do
-- FreelaPRO). Fecha o backlog do modal "Nova Tarefa".

create table public.process_installments (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  position int not null,
  value numeric(12,2) not null,
  payment_due_date timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index process_installments_process_id_idx on public.process_installments(process_id);

alter table public.process_installments enable row level security;

create policy "process_installments_select_staff" on public.process_installments
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_installments.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );
create policy "process_installments_select_self_client" on public.process_installments
  for select using (
    exists (
      select 1 from public.processes p
      where p.id = process_installments.process_id
        and p.client_id = (select client_id from public.users where id = auth.uid())
        and p.visible_in_portal = true
    )
  );
create policy "process_installments_manage_staff" on public.process_installments
  for all using (
    exists (
      select 1 from public.processes p
      where p.id = process_installments.process_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL')
    )
  );

-- backfill do único valor que já existia por processo (vira a parcela 1)
insert into public.process_installments (process_id, position, value, payment_due_date, paid_at)
select id, 1, value, payment_due_date, paid_at from public.processes where value is not null;

alter table public.processes drop column value;
alter table public.processes drop column payment_due_date;
alter table public.processes drop column paid_at;
