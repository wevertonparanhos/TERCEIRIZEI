-- 013 — Dados para o provedor Asaas.
-- CPF/CNPJ do pagador: exigido pelo Asaas para emitir cobrança (finalidade:
-- processamento do pagamento — LGPD art. 7º, V). Exibido sempre mascarado.
alter table public.customer_profiles
  add column cpf_cnpj varchar(14) check (cpf_cnpj is null or cpf_cnpj ~ '^\d{11}$|^\d{14}$'),
  add column asaas_customer_id text unique;

-- Chave PIX do profissional para receber os repasses (transferência via Asaas).
alter table public.provider_profiles
  add column payout_pix_key_type text check (payout_pix_key_type is null or payout_pix_key_type in ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP')),
  add column payout_pix_key text check (payout_pix_key is null or char_length(payout_pix_key) between 5 and 100);
