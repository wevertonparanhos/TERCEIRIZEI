-- A proposta passa a valer como CONTRATO DE PRESTACAO DE SERVICOS: tabela de servicos com o
-- preco de cada um (cobrado por solicitacao, sem valor total), faturamento no ultimo dia util
-- do mes pelo relatorio do cliente com vencimento no N-esimo dia util do mes seguinte,
-- clausulas obrigatorias (editaveis, mas nao removiveis) e prova do aceite digital.

alter table public.proposals
  add column due_business_day int not null default 5,
  add column late_fee_percent numeric(5,2) not null default 2,
  add column late_interest_percent numeric(5,2) not null default 1,
  add column notice_days int not null default 30,
  add column term_months int,
  add column foro text not null default 'Belo Horizonte/MG',
  add column clauses jsonb not null default '[]'::jsonb,
  add column accepted_by_name text,
  add column accepted_ip text;

-- Quando o servico e cobrado: "por solicitacao" (padrao), "mensal", "por hora"...
alter table public.proposal_items
  add column unit text;
