/** Regras puras da tela Hoje: saudação, data por extenso e janelas de dias (data-only em UTC, "hoje" = dia de Brasília). */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Hora de Brasília (0-23) de um instante. */
export function brtHour(instant: Date): number {
  return new Date(instant.getTime() - 3 * 60 * 60 * 1000).getUTCHours();
}

export function greetingFor(instant: Date): string {
  const h = brtHour(instant);
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Primeiro nome para a saudação ("Weverton Paranhos" → "Weverton"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

const WEEKDAYS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "quinta-feira, 26 de novembro" a partir do dia data-only (meia-noite UTC). */
export function longDate(day: Date): string {
  return `${WEEKDAYS[day.getUTCDay()]}, ${day.getUTCDate()} de ${MONTHS[day.getUTCMonth()]}`;
}

export function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * DAY_MS);
}

/** "hoje", "amanhã", "em 3 dias", "há 2 dias" — distância entre dois dias data-only. */
export function relativeDay(day: Date, today: Date): string {
  const diff = Math.round((Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()) - today.getTime()) / DAY_MS);
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  if (diff === -1) return "ontem";
  return diff > 0 ? `em ${diff} dias` : `há ${-diff} dias`;
}

/** "26/11" */
export function shortDate(day: Date): string {
  return `${String(day.getUTCDate()).padStart(2, "0")}/${String(day.getUTCMonth() + 1).padStart(2, "0")}`;
}
