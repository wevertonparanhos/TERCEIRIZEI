/** Data de início da tarefa (= data de criação, que define em que mês ela entra no relatório financeiro).
 * É guardada como o meio-dia de Brasília do dia escolhido, para o dia não "escorregar" por fuso. */

const NOON_BRT_UTC_HOUR = 15; // 12:00 em Brasília (UTC-3)

export type StartDateResult = { ok: true; date: Date } | { ok: false; error: string };

/** Converte AAAA-MM-DD no instante guardado; recusa datas inválidas, muito antigas ou muito no futuro. */
export function parseStartDate(iso: string, now: Date = new Date()): StartDateResult {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return { ok: false, error: "Informe uma data de início válida." };
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(year, month - 1, day, NOON_BRT_UTC_HOUR, 0, 0));
  // Recusa dias que não existem (31/02 viraria março).
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { ok: false, error: "Informe uma data de início válida." };
  }
  if (year < 2020) return { ok: false, error: "A data de início não pode ser anterior a 2020." };
  const limit = now.getTime() + 366 * 24 * 60 * 60 * 1000;
  if (date.getTime() > limit) return { ok: false, error: "A data de início não pode ser mais de um ano no futuro." };
  return { ok: true, date };
}

/** Instante de criação -> AAAA-MM-DD no dia de Brasília (para campos de data). */
export function startDateToInput(instant: Date): string {
  return instant.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}
