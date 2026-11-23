/** Regras dos lembretes: quando um lembrete vence, para onde o "adiar" leva e quando uma tarefa está parada demais
 * numa etapa. Datas-only em UTC (meia-noite), como no resto do sistema; "hoje" é o dia de Brasília. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dia de Brasília de um instante, como data-only (meia-noite UTC). */
export function brtDay(instant: Date): Date {
  const br = new Date(instant.getTime() - 3 * 60 * 60 * 1000);
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate()));
}

export type ReminderTiming = "atrasado" | "hoje" | "futuro";

/** Atrasado (data já passou), hoje, ou futuro. Um lembrete só "pede atenção" quando é atrasado ou de hoje. */
export function reminderTiming(remindOn: Date, today: Date): ReminderTiming {
  const diff = Math.round((remindOn.getTime() - today.getTime()) / DAY_MS);
  return diff < 0 ? "atrasado" : diff === 0 ? "hoje" : "futuro";
}

export const SNOOZE_OPTIONS = ["1d", "3d", "1w"] as const;
export type SnoozeOption = (typeof SNOOZE_OPTIONS)[number];

export const SNOOZE_LABELS: Record<SnoozeOption, string> = {
  "1d": "Amanhã",
  "3d": "Em 3 dias",
  "1w": "Em 1 semana",
};

/** Nova data de um lembrete adiado: sempre contada a partir de hoje. */
export function snoozeTo(today: Date, option: SnoozeOption): Date {
  const days = option === "1d" ? 1 : option === "3d" ? 3 : 7;
  return new Date(today.getTime() + days * DAY_MS);
}

export function isSnoozeOption(value: string): value is SnoozeOption {
  return (SNOOZE_OPTIONS as readonly string[]).includes(value);
}

export type StageAlert = { daysInStage: number; overdueBy: number };

/**
 * Alerta de tarefa parada: a etapa atual "cobra" depois de N dias e a tarefa já está lá há mais que isso.
 * `enteredAt` é quando a tarefa chegou na etapa; `snoozedUntil` (inclusive) silencia o alerta por uns dias.
 */
export function stageAlert(params: { alertAfterDays: number | null; enteredAt: Date | null; today: Date; snoozedUntil: Date | null }): StageAlert | null {
  const { alertAfterDays, enteredAt, today, snoozedUntil } = params;
  if (!alertAfterDays || alertAfterDays < 1 || !enteredAt) return null;
  if (snoozedUntil && snoozedUntil.getTime() >= today.getTime()) return null;
  const daysInStage = Math.round((today.getTime() - brtDay(enteredAt).getTime()) / DAY_MS);
  if (daysInStage <= alertAfterDays) return null;
  return { daysInStage, overdueBy: daysInStage - alertAfterDays };
}

/** "há 8 dias" / "há 1 dia" */
export function daysLabel(days: number): string {
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}
