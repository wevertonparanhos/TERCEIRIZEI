-- Tarefa arquivada (como no FreelaPRO): some do quadro e dos alertas, mas
-- continua contando no financeiro, nos relatorios por cliente e no historico.

alter table public.processes add column archived_at timestamptz;
create index processes_archived_at_idx on public.processes(tenant_id, archived_at);
