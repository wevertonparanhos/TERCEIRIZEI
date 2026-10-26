-- CPF/CNPJ e e-mail passam a ser opcionais no cliente (importacao do FreelaPRO,
-- onde so o nome e obrigatorio). Os indices unicos (tenant_id, doc) e
-- (tenant_id, email) continuam valendo: NULL nunca colide com NULL. Vazio deve
-- ser gravado como NULL, nunca como texto vazio.

alter table public.clients alter column doc drop not null;
alter table public.clients alter column email drop not null;
