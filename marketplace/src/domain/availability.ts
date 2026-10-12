/**
 * Agenda: calcula os horários livres de um profissional. Função pura.
 *
 * Fuso: horário de Brasília (America/Sao_Paulo), UTC−03:00 fixo — o Brasil não
 * adota horário de verão desde 2019. Se isso mudar, troque `TZ_OFFSET_MIN`
 * por uma biblioteca de fuso horário.
 */
export const TZ_OFFSET_MIN = -180;

export type WeeklyWindow = { weekday: number; startMinute: number; endMinute: number };
export type Interval = { start: Date; end: Date };

export type SlotQuery = {
  /** Data local "AAAA-MM-DD". */
  date: string;
  windows: WeeklyWindow[];
  timeOff: Interval[];
  /** Pedidos que ocupam a agenda (início → fim + intervalo). */
  busy: Interval[];
  durationMinutes: number;
  bufferMinutes: number;
  stepMinutes: number;
  /** Antecedência mínima a partir de agora. */
  minLeadHours: number;
  now: Date;
};

const MS_MIN = 60_000;

export function isValidLocalDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/** Instante UTC de um horário local (data + minutos desde 00:00 em Brasília). */
export function localToUtc(date: string, minuteOfDay: number): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, 0, minuteOfDay) - TZ_OFFSET_MIN * MS_MIN);
}

/** Data local "AAAA-MM-DD" de um instante. */
export function utcToLocalDate(instant: Date): string {
  return new Date(instant.getTime() + TZ_OFFSET_MIN * MS_MIN).toISOString().slice(0, 10);
}

/** Dia da semana local (0 = domingo). */
export function localWeekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

export type Slot = { start: Date; end: Date; blockedUntil: Date };

/**
 * Horários de início possíveis num dia: o serviço inteiro precisa caber numa
 * janela de trabalho, e o período [início, fim + intervalo) não pode cruzar
 * folgas nem outros pedidos.
 */
export function availableSlots(q: SlotQuery): Slot[] {
  if (!isValidLocalDate(q.date) || q.durationMinutes <= 0 || q.stepMinutes <= 0) return [];
  const weekday = localWeekday(q.date);
  const earliest = new Date(q.now.getTime() + q.minLeadHours * 60 * MS_MIN);
  const slots: Slot[] = [];

  const windows = q.windows
    .filter((w) => w.weekday === weekday && w.endMinute > w.startMinute)
    .sort((a, b) => a.startMinute - b.startMinute);

  for (const w of windows) {
    // Início alinhado à grade (ex.: 08:00, 08:30…), dentro da janela.
    const first = Math.ceil(w.startMinute / q.stepMinutes) * q.stepMinutes;
    for (let m = first; m + q.durationMinutes <= w.endMinute; m += q.stepMinutes) {
      const start = localToUtc(q.date, m);
      if (start < earliest) continue;
      const end = new Date(start.getTime() + q.durationMinutes * MS_MIN);
      const blockedUntil = new Date(end.getTime() + q.bufferMinutes * MS_MIN);
      const span = { start, end: blockedUntil };
      if (q.timeOff.some((t) => overlaps(span, t))) continue;
      if (q.busy.some((b) => overlaps(span, b))) continue;
      slots.push({ start, end, blockedUntil });
    }
  }
  return slots;
}

/** "08:30" no horário de Brasília. */
export function formatLocalTime(instant: Date): string {
  return new Date(instant.getTime() + TZ_OFFSET_MIN * MS_MIN).toISOString().slice(11, 16);
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;

export function minutesToHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function hhmmToMinutes(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}
