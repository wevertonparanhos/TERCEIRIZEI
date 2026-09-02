-- Terceirizei OS — Visibilidade do processo no portal do cliente (inspirado
-- no toggle equivalente do FreelaPRO). Default true — processos existentes
-- continuam visíveis, sem mudança de comportamento pra quem já usa o portal.

alter table public.processes add column visible_in_portal boolean not null default true;

drop policy "processes_select_self_client" on public.processes;
create policy "processes_select_self_client" on public.processes
  for select using (
    client_id = (select client_id from public.users where id = auth.uid())
    and visible_in_portal = true
  );
