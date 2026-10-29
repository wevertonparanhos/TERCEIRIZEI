-- % de conclusao configuravel por etapa do Kanban (usado no progresso que o cliente ve no portal).
-- Vazio = o sistema calcula pela posicao da etapa no quadro.

alter table public.kanban_stages
  add column progress_percent int check (progress_percent between 0 and 100);
