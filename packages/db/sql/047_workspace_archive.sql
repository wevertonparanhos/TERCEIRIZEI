-- 047: arquivar área de trabalho.
-- Área arquivada sai das abas do quadro, da Nova Tarefa e das listas de áreas; as tarefas dela continuam
-- existindo (financeiro, relatórios, lembretes, busca) e a área pode ser restaurada a qualquer momento.

alter table public.workspaces
  add column if not exists archived_at timestamptz;

comment on column public.workspaces.archived_at is 'Quando a área foi arquivada (vazio = ativa).';
