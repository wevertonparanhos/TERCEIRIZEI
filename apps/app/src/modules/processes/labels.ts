export const PRIORITY_LABELS: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export const PRIORITY_BADGE_VARIANT: Record<string, "neutral" | "success" | "warning" | "info"> = {
  BAIXA: "neutral",
  MEDIA: "info",
  ALTA: "warning",
  URGENTE: "warning",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  A_FAZER: "A fazer",
  EM_ANDAMENTO: "Em andamento",
  BLOQUEADA: "Bloqueada",
  CONCLUIDA: "Concluída",
};

const TERMINAL_STAGE_LABELS = ["Concluído", "Cancelado"];

/** true quando o processo tem prazo vencido e ainda não está numa etapa terminal. */
export function isProcessOverdue(dueAt: Date | null, stageLabel: string): boolean {
  if (!dueAt) return false;
  if (TERMINAL_STAGE_LABELS.includes(stageLabel)) return false;
  return dueAt.getTime() < Date.now();
}

/** Dias sem mudança de etapa para um processo ser considerado "parado". */
export const STALE_PROCESS_DAYS = 5;

/** true quando o processo está ativo e não muda de etapa há mais de STALE_PROCESS_DAYS dias. */
export function isProcessStale(stageLabel: string, lastStageChangeAt: Date): boolean {
  if (TERMINAL_STAGE_LABELS.includes(stageLabel)) return false;
  const daysSince = (Date.now() - lastStageChangeAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > STALE_PROCESS_DAYS;
}
