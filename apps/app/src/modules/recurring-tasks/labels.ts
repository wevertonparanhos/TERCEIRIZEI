export const FREQUENCIES = ["SEMANAL", "MENSAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  SEMANAL: "Semanal",
  MENSAL: "Mensal",
  TRIMESTRAL: "Trimestral",
  SEMESTRAL: "Semestral",
  ANUAL: "Anual",
};

/** Avança uma data pela frequência informada, em UTC — mesma convenção de
 * data-only usada em todo o projeto. Usa meses/anos de calendário pra
 * MENSAL/TRIMESTRAL/SEMESTRAL/ANUAL (não "30 dias"), pra manter o mesmo dia
 * do mês em cada ocorrência sempre que possível. */
export function addInterval(base: Date, frequency: Frequency): Date {
  const result = new Date(base);
  switch (frequency) {
    case "SEMANAL":
      result.setUTCDate(result.getUTCDate() + 7);
      break;
    case "MENSAL":
      result.setUTCMonth(result.getUTCMonth() + 1);
      break;
    case "TRIMESTRAL":
      result.setUTCMonth(result.getUTCMonth() + 3);
      break;
    case "SEMESTRAL":
      result.setUTCMonth(result.getUTCMonth() + 6);
      break;
    case "ANUAL":
      result.setUTCFullYear(result.getUTCFullYear() + 1);
      break;
  }
  return result;
}

/** true quando a tarefa recorrente já venceu (nextDueAt no passado) e ainda está ativa. */
export function isRecurringTaskDue(nextDueAt: Date, active: boolean, now: Date = new Date()): boolean {
  if (!active) return false;
  return nextDueAt.getTime() <= now.getTime();
}
