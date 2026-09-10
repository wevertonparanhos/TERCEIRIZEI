# Backups automáticos do banco — Terceirizei OS

Esta branch guarda os dumps automáticos do banco de produção (Supabase, projeto
"TERCEIRIZEI OS"), gerados diariamente pelo workflow
`.github/workflows/db-backup.yml` (na branch `master`).

- Formato: `pg_dump` em formato custom (`.dump`), restaurável com `pg_restore`.
- Retenção: os 30 dumps mais recentes (~1 mês).
- Gatilho: agendado (diário, 03:00 horário de Brasília) + manual (`workflow_dispatch`).

**Como restaurar um dump:**

```bash
pg_restore --no-owner --no-privileges -d "<CONNECTION_STRING_DESTINO>" caminho/do/arquivo.dump
```

Nunca restaure direto em produção sem antes confirmar que é exatamente isso que
você quer — um restore substitui os dados existentes no destino.
