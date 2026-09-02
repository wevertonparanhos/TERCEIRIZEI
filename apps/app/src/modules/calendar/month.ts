const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

/** Chave do mês no formato "YYYY-MM" (UTC) — usada na URL (?mes=) e como
 * chave de agrupamento. Datas-only do projeto sempre em UTC. */
export function monthKeyFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function resolveMonthKey(raw: string | undefined, now: Date = new Date()): string {
  if (raw && MONTH_KEY_RE.test(raw)) return raw;
  return monthKeyFromDate(now);
}

export function shiftMonthKey(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return monthKeyFromDate(d);
}

export function monthKeyLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, 1));
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function dayKeyFromDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export type MonthGridDay = { date: Date; dayKey: string; inMonth: boolean; isToday: boolean };

/** Grade de 6 semanas (42 dias, domingo a sábado) cobrindo o mês de `key`,
 * incluindo os dias de preenchimento do mês anterior/seguinte. */
export function getMonthGrid(key: string, now: Date = new Date()): MonthGridDay[] {
  const [year, month] = key.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - firstOfMonth.getUTCDay());

  const todayKey = dayKeyFromDate(now);
  const days: MonthGridDay[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + i);
    const dayKey = dayKeyFromDate(date);
    days.push({ date, dayKey, inMonth: date.getUTCMonth() === month - 1, isToday: dayKey === todayKey });
  }
  return days;
}

/** Janela [start, end] (UTC, dia cheio) coberta pela grade — usada para
 * limitar as queries ao que a grade realmente exibe. */
export function getMonthGridRange(key: string, now: Date = new Date()): { start: Date; end: Date } {
  const days = getMonthGrid(key, now);
  const start = days[0].date;
  const end = new Date(days[days.length - 1].date);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end };
}

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
