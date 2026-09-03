-- Terceirizei OS — @menções em comentários de processo. Só membros da equipe
-- podem ser mencionados (não o cliente). Gera notificação in-app (read_at),
-- sem e-mail — mesma limitação já documentada em Automações.

create table public.process_comment_mentions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.process_comments(id) on delete cascade,
  mentioned_user_id uuid not null references public.users(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index process_comment_mentions_comment_id_idx on public.process_comment_mentions(comment_id);
create index process_comment_mentions_mentioned_user_id_idx on public.process_comment_mentions(mentioned_user_id);

alter table public.process_comment_mentions enable row level security;

create policy "process_comment_mentions_select_staff" on public.process_comment_mentions
  for select using (
    exists (
      select 1 from public.process_comments c
      join public.processes p on p.id = c.process_id
      where c.id = process_comment_mentions.comment_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );
create policy "process_comment_mentions_manage_staff" on public.process_comment_mentions
  for all using (
    exists (
      select 1 from public.process_comments c
      join public.processes p on p.id = c.process_id
      where c.id = process_comment_mentions.comment_id
        and p.tenant_id = public.current_tenant_id()
        and public.current_role_name() in ('ADMIN','GESTOR','OPERACIONAL','FINANCEIRO')
    )
  );
