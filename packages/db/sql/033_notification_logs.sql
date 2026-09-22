-- Registro de dedupe para avisos automáticos "lazy" (computados a cada
-- leitura, sem job/cron) que não têm um evento de criação único pra marcar
-- contra — ex.: lembrete de prazo de tarefa por e-mail. Um insert que colide
-- com a constraint única já foi enviado.

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  key text not null,
  sent_at timestamptz not null default now(),
  unique (tenant_id, key)
);

create index notification_logs_tenant_id_idx on public.notification_logs(tenant_id);

alter table public.notification_logs enable row level security;

create policy "notification_logs_all_staff" on public.notification_logs
  for all using (
    tenant_id = public.current_tenant_id()
    and public.current_role_name() in ('ADMIN', 'GESTOR', 'OPERACIONAL', 'FINANCEIRO')
  );
