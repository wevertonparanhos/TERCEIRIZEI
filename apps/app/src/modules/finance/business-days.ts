// Dias úteis do contrato de prestação de serviços: o relatório do cliente é enviado no ÚLTIMO dia útil do
// mês e vence até o N-ésimo dia útil (padrão 5º) do mês seguinte. Dia útil = segunda a sexta que não seja
// feriado nacional nem dia sem expediente bancário (Carnaval, Sexta-feira Santa, Corpus Christi).
// Feriados estaduais e municipais NÃO entram (variam por cidade).
//
// Todas as datas são "só data" em UTC (meia-noite), o mesmo padrão do resto do sistema.

const DAY_MS = 86400000;

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function key(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). `month` é 0-11. */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month - 1, day);
}

const holidayCache = new Map<number, Set<string>>();

/** Feriados nacionais e dias sem expediente bancário do ano (datas AAAA-MM-DD). */
export function holidaysOf(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year).getTime();
  const fromEaster = (days: number) => key(new Date(easter + days * DAY_MS));
  const set = new Set<string>([
    key(utc(year, 0, 1)), // Confraternização Universal
    key(utc(year, 3, 21)), // Tiradentes
    key(utc(year, 4, 1)), // Dia do Trabalho
    key(utc(year, 8, 7)), // Independência
    key(utc(year, 9, 12)), // Nossa Senhora Aparecida
    key(utc(year, 10, 2)), // Finados
    key(utc(year, 10, 15)), // Proclamação da República
    key(utc(year, 11, 25)), // Natal
    fromEaster(-48), // Segunda de Carnaval
    fromEaster(-47), // Terça de Carnaval
    fromEaster(-2), // Sexta-feira Santa
    fromEaster(60), // Corpus Christi
  ]);
  if (year >= 2024) set.add(key(utc(year, 10, 20))); // Consciência Negra (nacional desde 2024)

  holidayCache.set(year, set);
  return set;
}

export function isBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  if (weekday === 0 || weekday === 6) return false;
  return !holidaysOf(date.getUTCFullYear()).has(key(date));
}

/** Último dia útil do mês. `month` é 0-11. */
export function lastBusinessDayOfMonth(year: number, month: number): Date {
  let d = utc(year, month + 1, 0); // último dia do mês
  while (!isBusinessDay(d)) d = new Date(d.getTime() - DAY_MS);
  return d;
}

/** N-ésimo dia útil do mês (1 = primeiro). `month` é 0-11. */
export function nthBusinessDayOfMonth(year: number, month: number, n: number): Date {
  let d = utc(year, month, 1);
  let count = 0;
  for (;;) {
    if (isBusinessDay(d)) {
      count += 1;
      if (count >= n) return d;
    }
    d = new Date(d.getTime() + DAY_MS);
  }
}

/** Datas do ciclo de cobrança de um mês de referência: envio do relatório e vencimento. */
export function billingCycle(year: number, month: number, dueBusinessDay = 5): { sendDate: Date; dueDate: Date } {
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = (month + 1) % 12;
  return {
    sendDate: lastBusinessDayOfMonth(year, month),
    dueDate: nthBusinessDayOfMonth(nextYear, nextMonth, dueBusinessDay),
  };
}
