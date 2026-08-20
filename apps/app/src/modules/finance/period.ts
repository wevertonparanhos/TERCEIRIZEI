export const PERIOD_KEYS = ["hoje", "semana", "mes", "mes_passado", "30dias", "ano", "personalizado"] as const;
export type PeriodKey = (typeof PERIOD_KEYS)[number];

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoje: "Hoje",
  semana: "Semana",
  mes: "Mês",
  mes_passado: "Mês passado",
  "30dias": "30 dias",
  ano: "Ano",
  personalizado: "Personalizado",
};

function startOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function endOfUTCDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

/** Resolve um período em [start, end] (UTC, dia cheio) a partir de um atalho ou
 * de um intervalo customizado. Datas-only do projeto sempre em UTC — ver convenção
 * já usada nos outros campos de data (evita o bug de "um dia a menos"). */
export function resolvePeriod(key: PeriodKey, customStart?: string, customEnd?: string, now: Date = new Date()): { start: Date; end: Date } {
  switch (key) {
    case "hoje":
      return { start: startOfUTCDay(now), end: endOfUTCDay(now) };
    case "semana": {
      // Semana cheia (domingo a sábado) contendo hoje — inclui dias futuros da
      // semana, já que a data de pagamento de uma demanda é frequentemente futura.
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() - now.getUTCDay());
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 6);
      return { start: startOfUTCDay(start), end: endOfUTCDay(end) };
    }
    case "mes": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      return { start, end };
    }
    case "mes_passado": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
      return { start, end };
    }
    case "30dias": {
      // Janela retroativa de 30 dias terminando hoje — diferente de "Mês", que é o
      // mês corrente inteiro (inclusive dias futuros).
      const start = new Date(now);
      start.setUTCDate(now.getUTCDate() - 30);
      return { start: startOfUTCDay(start), end: endOfUTCDay(now) };
    }
    case "ano":
      return {
        start: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)),
        end: new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59, 999)),
      };
    case "personalizado":
      return {
        start: customStart ? startOfUTCDay(new Date(customStart)) : startOfUTCDay(now),
        end: customEnd ? endOfUTCDay(new Date(customEnd)) : endOfUTCDay(now),
      };
  }
}

export type PaymentSummary = {
  total: number;
  recebido: number;
  pendente: number;
  atrasado: number;
  count: number;
};

/** Soma os valores de uma lista de processos-com-pagamento por status —
 * usado tanto no Financeiro geral quanto no relatório por cliente. */
export function summarizePayments(
  processes: { value: number; paymentDueDate: Date | null; paidAt: Date | null }[],
  now: Date = new Date()
): PaymentSummary {
  const summary: PaymentSummary = { total: 0, recebido: 0, pendente: 0, atrasado: 0, count: 0 };
  for (const p of processes) {
    summary.count += 1;
    summary.total += p.value;
    if (p.paidAt) {
      summary.recebido += p.value;
    } else if (p.paymentDueDate && p.paymentDueDate.getTime() < now.getTime()) {
      summary.atrasado += p.value;
    } else {
      summary.pendente += p.value;
    }
  }
  return summary;
}
