-- Terceirizei OS — mudança do modelo de cobrança: pagamento passa a viver
-- direto no processo (valor já existia; agora ganha data prevista de
-- pagamento + data em que foi efetivamente pago), substituindo o fluxo
-- manual de "gerar fatura". O sistema de Invoice/InvoiceItem antigo
-- permanece no banco como histórico, mas deixa de ser o caminho principal.

alter table public.processes
  add column payment_due_date timestamptz,
  add column paid_at timestamptz;

-- Backfill a partir de faturas reais já existentes, pra não perder o dado
-- ao migrar do modelo antigo.
update public.processes p
set payment_due_date = i.due_date,
    paid_at = case when i.status = 'PAGA' then i.paid_at else null end
from public.invoice_items ii
join public.invoices i on i.id = ii.invoice_id
where ii.process_id = p.id and i.status != 'CANCELADA';
