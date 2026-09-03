-- Terceirizei OS — Aprovação do cliente por documento (não do processo
-- inteiro) — usada pra entregáveis enviados na etapa de conclusão. Staff
-- solicita manualmente, cliente aprova/recusa no portal com nota opcional.
-- Puramente informativo: não trava mudança de etapa no Kanban.

create type public.document_approval_status as enum ('PENDENTE', 'APROVADO', 'RECUSADO');

alter table public.documents add column approval_status public.document_approval_status;
alter table public.documents add column approval_note text;

-- cliente precisa poder atualizar o próprio documento pra registrar a resposta
-- de aprovação (a Server Action é a fronteira real, já que Prisma bypassa RLS
-- aqui — esta policy é defesa em profundidade, mesmo padrão do resto do projeto).
create policy "documents_update_approval_self_client" on public.documents
  for update using (
    client_id = (select client_id from public.users where id = auth.uid())
  );
