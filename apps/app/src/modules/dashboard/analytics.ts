const MONTH_LABELS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export type MonthBucket = { year: number; month: number; label: string };

/** Últimos `n` meses (UTC), incluindo o mês atual, do mais antigo pro mais recente. */
export function getLastMonths(n: number, now: Date = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({ year: d.getUTCFullYear(), month: d.getUTCMonth(), label: MONTH_LABELS[d.getUTCMonth()] });
  }
  return buckets;
}

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

/** Soma `value` por mês (UTC) dos buckets informados; datas fora do intervalo dos buckets são ignoradas. */
export function sumByMonth(rows: { date: Date | null; value: number }[], buckets: MonthBucket[]): number[] {
  const totals = new Map(buckets.map((b) => [monthKey(b.year, b.month), 0]));
  for (const row of rows) {
    if (!row.date) continue;
    const key = monthKey(row.date.getUTCFullYear(), row.date.getUTCMonth());
    if (totals.has(key)) totals.set(key, (totals.get(key) ?? 0) + row.value);
  }
  return buckets.map((b) => totals.get(monthKey(b.year, b.month)) ?? 0);
}

/** Conta ocorrências por mês (UTC) dos buckets informados. */
export function countByMonth(rows: { date: Date }[], buckets: MonthBucket[]): number[] {
  return sumByMonth(
    rows.map((r) => ({ date: r.date, value: 1 })),
    buckets
  );
}

export type LabelCount = { label: string; count: number };

/** Conta ocorrências por rótulo, ordenado do maior pro menor, agrupando o excedente
 * além de `maxSlots` em "Outros" (evita mais de ~7 classes de cor no gráfico). */
export function countByLabel(rows: { label: string }[], maxSlots = 7): LabelCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.label, (counts.get(row.label) ?? 0) + 1);
  const sorted = Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length <= maxSlots) return sorted;

  const top = sorted.slice(0, maxSlots);
  const rest = sorted.slice(maxSlots).reduce((sum, r) => sum + r.count, 0);
  return [...top, { label: "Outros", count: rest }];
}
