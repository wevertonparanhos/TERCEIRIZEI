-- CNPJ não existe ainda no momento em que um processo de Abertura é criado
-- (só é emitido pela Receita Federal numa das últimas etapas do workflow) —
-- tornado opcional pra refletir a realidade do fluxo.
alter table companies alter column cnpj drop not null;
