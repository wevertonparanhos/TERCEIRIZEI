export const STATUS_LABELS: Record<string, string> = {
  NOVA: "Nova",
  EM_ANALISE: "Em análise",
  AGUARDANDO_CLIENTE: "Aguardando cliente",
  EM_EXECUCAO: "Em execução",
  EM_REVISAO: "Em revisão",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const STATUS_BADGE_VARIANT: Record<string, "neutral" | "success" | "warning" | "info"> = {
  NOVA: "info",
  EM_ANALISE: "info",
  AGUARDANDO_CLIENTE: "warning",
  EM_EXECUCAO: "info",
  EM_REVISAO: "warning",
  CONCLUIDA: "success",
  CANCELADA: "neutral",
};

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

/** Dias sem mudança de status para uma demanda ser considerada "parada". */
export const STALE_DEMAND_DAYS = 5;

/** true quando a demanda está aberta e não muda de status há mais de STALE_DEMAND_DAYS dias. */
export function isDemandStale(status: string, lastStatusChangeAt: Date): boolean {
  if (status === "CONCLUIDA" || status === "CANCELADA") return false;
  const daysSince = (Date.now() - lastStatusChangeAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > STALE_DEMAND_DAYS;
}
