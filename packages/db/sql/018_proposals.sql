-- Terceirizei OS — Propostas comerciais (inspirado no recurso equivalente do
-- FreelaPRO). Vinculada a um Client já cadastrado (não existe entidade de
-- lead/prospect no sistema ainda). RASCUNHO é editável livremente; ENVIADA
-- trava os itens e fica visível/respondível no portal do cliente.
-- Acesso interno: ADMIN/GESTOR gerenciam, FINANCEIRO só visualiza (natureza
-- comercial, não contábil, diferente do Financeiro que FINANCEIRO gerencia).

create type proposal_status as enum ('RASCUNHO','ENVIADA','ACEITA','RECUSADA');

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  number int not null,
  client_id uuid not null references public.clients(id),
  title text not null,
  status proposal_status not null default 'RASCUNHO',
  valid_until timestamptz,
  notes text,
  response_note text,
  sent_at timestamptz,
  responded_at timestamptz,
  created_by_id uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, number)
);
create index proposals_tenant_id_idx on public.proposals(tenant_id);
create index proposals_client_id_idx on public.proposals(client_id);

create table public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  description text not null,
  value numeric(12,2) not null,
  created_at timestamptz not null default now()
);
create index proposal_items_proposal_id_idx on public.proposal_items(proposal_id);

alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;

create policy "proposals_select_staff" on public.proposals
  for select using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR','FINANCEIRO')
  );
create policy "proposals_select_self_client" on public.proposals
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
    and status <> 'RASCUNHO'
  );
create policy "proposals_manage_staff" on public.proposals
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN','GESTOR')
  );

create policy "proposal_items_select_staff" on public.proposal_items
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_items.proposal_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','FINANCEIRO')
    )
  );
create policy "proposal_items_select_self_client" on public.proposal_items
  for select using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_items.proposal_id
        and p.client_id = (select client_id from public.users where id = auth.uid())
        and p.status <> 'RASCUNHO'
    )
  );
create policy "proposal_items_manage_staff" on public.proposal_items
  for all using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_items.proposal_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR')
    )
  );
