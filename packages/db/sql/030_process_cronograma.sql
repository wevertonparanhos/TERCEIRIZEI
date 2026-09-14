-- Cronograma da tarefa (inspirado no FreelaPRO): pares previsto/real de início,
-- conclusão e entrega. "due_at" já existente cobre "Prev. conclusão" — aqui
-- completamos os outros 5 campos, todos opcionais.
alter table public.processes
  add column planned_start_at timestamptz,
  add column actual_start_at timestamptz,
  add column actual_completion_at timestamptz,
  add column planned_delivery_at timestamptz,
  add column actual_delivery_at timestamptz;
