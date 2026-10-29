/** Cálculos puros da tela Financeiro (comparação com o período anterior, fluxo de caixa, próximos recebimentos,
 * top clientes). Datas-only em UTC, como no resto do projeto. */

const DAY_MS = 24 * 60 * 60 * 1000;

export type FlowRow = {
  clientId: string;
  clientName: string;
  value: number;
  paymentDueDate: Date | null;
  paidAt: Date | null;
};

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Período imediatamente anterior, com a mesma quantidade de dias. */
export function previousRange(start: Date, end: Date): { start: Date; end: Date } {
  const days = Math.round((startOfUTCDay(end).getTime() - startOfUTCDay(start).getTime()) / DAY_MS) + 1;
  const prevEnd = new Date(startOfUTCDay(start).getTime() - 1);
  const prevStart = new Date(startOfUTCDay(start).getTime() - days * DAY_MS);
  return { start: prevStart, end: prevEnd };
}

/** Variação percentual entre o valor atual e o anterior; null quando não há base para comparar. */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export type CashflowPoint = { key: string; label: string; recebido: number; pendente: number; acumulado: number };

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Fluxo de caixa do período pela data de vencimento: recebido (pago), pendente (em aberto) e acumulado (total até o dia).
 * Até ~3 meses é por dia; períodos maiores (ano) são agrupados por mês para o gráfico não virar um borrão.
 */
export function buildCashflow(rows: FlowRow[], start: Date, end: Date): CashflowPoint[] {
  const s = startOfUTCDay(start);
  const e = startOfUTCDay(end);
  const days = Math.round((e.getTime() - s.getTime()) / DAY_MS) + 1;
  if (days <= 0) return [];
  const byMonth = days > 93;

  const buckets = new Map<string, CashflowPoint>();
  const keys: string[] = [];
  const keyOf = (d: Date) => (byMonth ? `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}` : `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
  const labelOf = (d: Date) => (byMonth ? `${pad(d.getUTCMonth() + 1)}/${String(d.getUTCFullYear()).slice(2)}` : `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`);

  for (let t = s.getTime(); t <= e.getTime(); t += DAY_MS) {
    const d = new Date(t);
    const key = keyOf(d);
    if (!buckets.has(key)) {
      buckets.set(key, { key, label: labelOf(d), recebido: 0, pendente: 0, acumulado: 0 });
      keys.push(key);
    }
  }

  for (const row of rows) {
    if (!row.paymentDueDate) continue;
    const bucket = buckets.get(keyOf(row.paymentDueDate));
    if (!bucket) continue;
    if (row.paidAt) bucket.recebido += row.value;
    else bucket.pendente += row.value;
  }

  let running = 0;
  return keys.map((key) => {
    const b = buckets.get(key)!;
    running += b.recebido + b.pendente;
    return { ...b, acumulado: running };
  });
}

export type UpcomingItem = { id: string; label: string; clientName: string; dueDate: Date; value: number };
export type UpcomingGroup = { key: string; title: string; total: number; items: UpcomingItem[] };

const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const dayMonth = (d: Date) => `${d.getUTCDate()} de ${MONTHS_SHORT[d.getUTCMonth()]}`;

/** Agrupa os pagamentos a vencer em semanas (domingo a sábado), em ordem de data. */
export function groupUpcomingByWeek(items: UpcomingItem[]): UpcomingGroup[] {
  const sorted = [...items].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const groups = new Map<string, UpcomingGroup>();
  for (const item of sorted) {
    const day = startOfUTCDay(item.dueDate);
    const weekStart = new Date(day.getTime() - day.getUTCDay() * DAY_MS);
    const weekEnd = new Date(weekStart.getTime() + 6 * DAY_MS);
    const key = weekStart.toISOString().slice(0, 10);
    let g = groups.get(key);
    if (!g) {
      g = { key, title: `${dayMonth(weekStart)} – ${dayMonth(weekEnd)}`, total: 0, items: [] };
      groups.set(key, g);
    }
    g.total += item.value;
    g.items.push(item);
  }
  return Array.from(groups.values());
}

export type TopClient = { clientId: string; clientName: string; count: number; recebido: number; pendente: number; total: number };

/** Clientes com mais valor movimentado no período, do maior para o menor. */
export function topClients(rows: FlowRow[], limit = 6): TopClient[] {
  const map = new Map<string, TopClient>();
  for (const row of rows) {
    const c = map.get(row.clientId) ?? { clientId: row.clientId, clientName: row.clientName, count: 0, recebido: 0, pendente: 0, total: 0 };
    c.count += 1;
    c.total += row.value;
    if (row.paidAt) c.recebido += row.value;
    else c.pendente += row.value;
    map.set(row.clientId, c);
  }
  return Array.from(map.values())
    .sort((a, b) => b.total - a.total || a.clientName.localeCompare(b.clientName, "pt-BR"))
    .slice(0, limit);
}

/** Dias de atraso em relação a hoje (0 quando ainda não venceu). */
export function daysOverdue(due: Date, today: Date): number {
  return Math.max(0, Math.round((startOfUTCDay(today).getTime() - startOfUTCDay(due).getTime()) / DAY_MS));
}
