-- 004 — Ajustes apontados pelo Security Advisor do Supabase.
-- (Tabelas com RLS e sem policy são intencionais: negação total para
-- anon/authenticated; o acesso a esses dados passa só pelo servidor.)

alter function public.protect_confirmed_booking() set search_path = public;
alter function public.forbid_mutation() set search_path = public;

create schema if not exists extensions;
alter extension btree_gist set schema extensions;
