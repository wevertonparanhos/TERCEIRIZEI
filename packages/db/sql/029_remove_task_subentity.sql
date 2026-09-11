-- Remove o conceito de "subtarefa" (model Task, criado antes desta sessão, e
-- TaskImpediment/ProcessInstallment.task_id, adicionados nesta mesma sessão).
-- Decisão do usuário: não haverá subtarefa — cada Tarefa (antigo Processo) já
-- carrega nativamente responsável (ProcessAssignee), prazo, pendências
-- (ProcessImpediment), valores (ProcessInstallment) e observações (notes).
-- Tabela "tasks" estava com 0 registros reais no momento da remoção.

drop table if exists public.task_impediments;
alter table public.process_installments drop column if exists task_id;
drop table if exists public.tasks;
drop type if exists public.task_status;
