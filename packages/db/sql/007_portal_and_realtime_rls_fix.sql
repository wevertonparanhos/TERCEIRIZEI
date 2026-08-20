-- Etapa 7 — Portal do Cliente
-- Nenhuma alteração de schema nesta etapa (reutiliza tabelas de demands/processes/documents).
--
-- Bug de segurança/infraestrutura descoberto e corrigido durante os testes do
-- Realtime no Portal:
--
-- current_tenant_id() e current_role_name() (criadas na migration 001) liam
-- public.users, que por sua vez tem policy de RLS que chama current_tenant_id().
-- Prisma (role postgres) e o MCP do Supabase bypassam RLS, então essa recursão
-- ficou latente desde a Etapa 2. O Supabase Realtime foi o primeiro caminho a
-- de fato avaliar RLS nessas tabelas (via realtime.apply_rls/list_changes) e
-- estourou "stack depth limit exceeded".
--
-- Fix: tornar as duas funções SECURITY DEFINER (seguro — elas só devolvem
-- dados do próprio auth.uid() do chamador, nunca de terceiros).

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid()
$$;

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select r.name::text
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.id = auth.uid()
$$;

-- SECURITY DEFINER torna as funções executáveis via RPC por padrão. O
-- Supabase Advisor aponta isso como "publicly executable". Para anon,
-- auth.uid() é NULL, então ambas as funções retornam NULL — nenhum dado
-- vaza — mas mantemos o grant explícito documentado (necessário também para
-- o Realtime, que avalia RLS em lote para todas as subscriptions ativas,
-- inclusive as ainda não autenticadas; revogar de anon quebra a entrega de
-- eventos para TODOS os assinantes quando qualquer subscription anônima
-- estiver no lote).
grant execute on function public.current_tenant_id() to anon, authenticated, public;
grant execute on function public.current_role_name() to anon, authenticated, public;
