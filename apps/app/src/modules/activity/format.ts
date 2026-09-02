export const ENTITY_TYPE_LABELS: Record<string, string> = {
  client: "Cliente",
  process: "Processo",
  demand: "Processo", // legado: entityType de antes da fusão Demanda/Processo (Etapa 16)
  document: "Documento",
  document_request: "Solicitação de documento",
  invoice: "Fatura",
  recurring_task: "Tarefa recorrente",
  user: "Usuário",
};

export const ENTITY_TYPE_DOT: Record<string, string> = {
  client: "bg-sky-500",
  process: "bg-blue-500",
  demand: "bg-blue-500",
  document: "bg-violet-500",
  document_request: "bg-rose-500",
  invoice: "bg-emerald-500",
  recurring_task: "bg-amber-500",
  user: "bg-slate-500",
};

/** Texto relativo curto pra atividade recente; cai pra data completa depois
 * de 7 dias (uma trilha de meses inteira em "há X dias" perde utilidade). */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} minuto${diffMin === 1 ? "" : "s"}`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours} hora${diffHours === 1 ? "" : "s"}`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;

  return date.toLocaleDateString("pt-BR");
}

/** Rótulo do cabeçalho de grupo do dia: Hoje / Ontem / data completa — usa
 * UTC pra data-only (convenção do projeto), mas createdAt é timestamptz
 * (instante real), então compara o dia local mesmo (fuso do usuário). */
export function dayLabel(date: Date, now: Date = new Date()): string {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type ActivityLog = { id: string; description: string; entityType: string; createdAt: Date; userName: string | null };
export type ActivityGroup = { key: string; label: string; logs: ActivityLog[] };

/** Agrupa por dia local, preservando a ordem (mais recente primeiro) já
 * garantida pela query. */
export function groupLogsByDay(logs: ActivityLog[], now: Date = new Date()): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  const indexByKey = new Map<string, number>();

  for (const log of logs) {
    const key = dayKey(log.createdAt);
    let index = indexByKey.get(key);
    if (index === undefined) {
      index = groups.length;
      indexByKey.set(key, index);
      groups.push({ key, label: dayLabel(log.createdAt, now), logs: [] });
    }
    groups[index].logs.push(log);
  }

  return groups;
}
