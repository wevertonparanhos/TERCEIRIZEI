-- Terceirizei OS — marca "até quando" cada membro da equipe já viu os
-- comentários de um processo, pra calcular "comentário do cliente não lido"
-- no dashboard e no Kanban. Não guarda o comentário em si.

create table public.process_comment_reads (
  process_id uuid not null references public.processes(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  last_read_at timestamptz not null,
  primary key (process_id, user_id)
);
create index process_comment_reads_user_id_idx on public.process_comment_reads(user_id);

alter table public.process_comment_reads enable row level security;

create policy "process_comment_reads_own" on public.process_comment_reads
  for all using (user_id = auth.uid());
