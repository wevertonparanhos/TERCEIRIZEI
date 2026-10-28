-- 1) Comentario visivel ao cliente. Padrao FECHADO: so a equipe ve. Comentarios escritos
--    por clientes sao sempre visiveis. Os comentarios migrados do FreelaPRO (com senhas e
--    anotacoes internas) ficam internos.
alter table public.process_comments add column client_visible boolean not null default false;

update public.process_comments c
   set client_visible = true
 where exists (
   select 1 from public.users u join public.roles r on r.id = u.role_id
    where u.id = c.author_id and r.name = 'CLIENTE'
 );

-- 2) Tarefa aberta pelo proprio cliente no portal (destaque no quadro da equipe).
alter table public.processes add column requested_by_client boolean not null default false;

update public.processes p
   set requested_by_client = true
 where exists (
   select 1
     from public.process_stages s
     join public.users u on u.id = s.user_id
     join public.roles r on r.id = u.role_id
    where s.process_id = p.id and s.from_stage_id is null and r.name = 'CLIENTE'
 );

-- 3) Aba "Informacoes" da tarefa: campos livres so da equipe (CNPJ, acessos, links).
create table public.process_info_fields (
  id uuid primary key default gen_random_uuid(),
  process_id uuid not null references public.processes(id) on delete cascade,
  label text not null,
  value text not null default '',
  position int not null default 0,
  updated_by_id uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index process_info_fields_process_id_idx on public.process_info_fields(process_id);

alter table public.process_info_fields enable row level security;

create policy "process_info_fields_all_staff" on public.process_info_fields
  for all using (
    exists (
      select 1 from public.processes p
       where p.id = process_info_fields.process_id
         and p.tenant_id = public.current_tenant_id()
    )
    and public.current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL', 'FINANCEIRO')
  );
