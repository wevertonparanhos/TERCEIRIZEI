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

/** Usado para calcular o prazo desejado a partir do prazo padrão (em dias) do modelo de
 * serviço. Soma em UTC (não no fuso local do servidor) pra não introduzir o mesmo tipo de
 * bug de "um dia a menos/a mais" já visto em campos de data-only neste projeto. */
export function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/** true quando existe comentário do cliente mais recente que a última vez que esse
 * membro da equipe visualizou o processo (ou nunca visualizou). */
export function hasUnreadClientComment(lastClientCommentAt: Date | null, lastReadAt: Date | null): boolean {
  if (!lastClientCommentAt) return false;
  if (!lastReadAt) return true;
  return lastClientCommentAt.getTime() > lastReadAt.getTime();
}

export type PaymentStatus = "SEM_PAGAMENTO" | "PAGO" | "ATRASADO" | "PENDENTE";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  SEM_PAGAMENTO: "Sem pagamento",
  PAGO: "Pago",
  ATRASADO: "Atrasado",
  PENDENTE: "Pendente",
};

export const PAYMENT_STATUS_BADGE_VARIANT: Record<PaymentStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  SEM_PAGAMENTO: "neutral",
  PAGO: "success",
  ATRASADO: "danger",
  PENDENTE: "warning",
};

/** Deriva o status de pagamento de uma parcela a partir de value/paymentDueDate/paidAt —
 * não é persistido, sempre calculado. */
export function getPaymentStatus(
  value: number | null,
  paymentDueDate: Date | null,
  paidAt: Date | null
): PaymentStatus {
  if (!value) return "SEM_PAGAMENTO";
  if (paidAt) return "PAGO";
  if (paymentDueDate && paymentDueDate.getTime() < Date.now()) return "ATRASADO";
  return "PENDENTE";
}

/** Resume o status de pagamento do processo a partir de todas as suas parcelas —
 * pior caso primeiro (1 parcela atrasada já marca o processo inteiro como
 * atrasado), igual à prioridade visual que o badge único tinha antes das
 * parcelas existirem. */
export function getProcessPaymentSummary(
  installments: { value: number; paymentDueDate: Date | null; paidAt: Date | null }[]
): { status: PaymentStatus; totalValue: number; paidCount: number; totalCount: number } {
  if (installments.length === 0) return { status: "SEM_PAGAMENTO", totalValue: 0, paidCount: 0, totalCount: 0 };

  const statuses = installments.map((i) => getPaymentStatus(i.value, i.paymentDueDate, i.paidAt));
  const totalValue = installments.reduce((sum, i) => sum + i.value, 0);
  const paidCount = statuses.filter((s) => s === "PAGO").length;

  const status: PaymentStatus = statuses.includes("ATRASADO")
    ? "ATRASADO"
    : statuses.every((s) => s === "PAGO")
      ? "PAGO"
      : "PENDENTE";

  return { status, totalValue, paidCount, totalCount: installments.length };
}

/** Minutos sem heartbeat até uma marca de "Estou aqui" ser considerada
 * expirada — sem job/cron, calculado a cada leitura. */
export const PRESENCE_EXPIRY_MINUTES = 15;

/** true quando lastSeenAt ainda está dentro da janela de expiração. */
export function isPresenceActive(lastSeenAt: Date, now: Date = new Date()): boolean {
  const minutesSince = (now.getTime() - lastSeenAt.getTime()) / (1000 * 60);
  return minutesSince <= PRESENCE_EXPIRY_MINUTES;
}

/** Iniciais pro avatar circular do responsável — primeira + última palavra do
 * nome, ou as duas primeiras letras se for um nome de uma palavra só. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** true quando a data (UTC, dia cheio) cai no dia de hoje — usado pro KPI
 * "Entrega hoje" do Kanban. */
export function isDueToday(dueAt: Date | null, now: Date = new Date()): boolean {
  if (!dueAt) return false;
  return (
    dueAt.getUTCFullYear() === now.getUTCFullYear() &&
    dueAt.getUTCMonth() === now.getUTCMonth() &&
    dueAt.getUTCDate() === now.getUTCDate()
  );
}
