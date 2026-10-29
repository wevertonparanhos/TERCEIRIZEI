-- Pagamentos da tarefa no padrao do FreelaPRO: cada pagamento ganha um titulo (ex.: "1a parcela", "Sinal")
-- e uma descricao opcional.
alter table public.process_installments
  add column title text,
  add column notes text;
