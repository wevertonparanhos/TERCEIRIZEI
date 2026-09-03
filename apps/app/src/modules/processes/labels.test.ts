import { describe, it, expect } from "vitest";
import {
  isProcessOverdue,
  isProcessStale,
  STALE_PROCESS_DAYS,
  addDays,
  hasUnreadClientComment,
  getPaymentStatus,
  getProcessPaymentSummary,
  initials,
  isDueToday,
} from "./labels";

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

describe("isProcessOverdue", () => {
  it("é true quando o prazo já passou e a etapa não é terminal", () => {
    expect(isProcessOverdue(daysFromNow(-3), "Triagem")).toBe(true);
  });

  it("é false quando o prazo ainda não chegou", () => {
    expect(isProcessOverdue(daysFromNow(3), "Triagem")).toBe(false);
  });

  it("é false quando não há prazo definido", () => {
    expect(isProcessOverdue(null, "Triagem")).toBe(false);
  });

  it("é false para etapa Concluído, mesmo com prazo vencido", () => {
    expect(isProcessOverdue(daysFromNow(-10), "Concluído")).toBe(false);
  });

  it("é false para etapa Cancelado, mesmo com prazo vencido", () => {
    expect(isProcessOverdue(daysFromNow(-10), "Cancelado")).toBe(false);
  });
});

describe("isProcessStale", () => {
  it("é true quando o processo está ativo e passou do limite de dias sem mudar de etapa", () => {
    expect(isProcessStale("Triagem", daysAgo(STALE_PROCESS_DAYS + 1))).toBe(true);
  });

  it("é false quando a etapa mudou dentro do limite", () => {
    expect(isProcessStale("Triagem", daysAgo(STALE_PROCESS_DAYS - 1))).toBe(false);
  });

  it("é false para etapa Concluído, mesmo parado há muito tempo", () => {
    expect(isProcessStale("Concluído", daysAgo(30))).toBe(false);
  });

  it("é false para etapa Cancelado, mesmo parado há muito tempo", () => {
    expect(isProcessStale("Cancelado", daysAgo(30))).toBe(false);
  });

  it("é false para um processo recém-criado", () => {
    expect(isProcessStale("Triagem", new Date())).toBe(false);
  });
});

describe("addDays", () => {
  it("soma dias corretamente, inclusive virando o mês", () => {
    const result = addDays(new Date("2026-08-30T00:00:00Z"), 5);
    expect(result.getUTCMonth()).toBe(8); // setembro (0-indexado)
    expect(result.getUTCDate()).toBe(4);
  });

  it("soma zero dias sem alterar a data", () => {
    const base = new Date("2026-08-20T00:00:00Z");
    const result = addDays(base, 0);
    expect(result.getTime()).toBe(base.getTime());
  });
});

describe("hasUnreadClientComment", () => {
  it("é false quando não há comentário do cliente", () => {
    expect(hasUnreadClientComment(null, new Date("2026-08-01"))).toBe(false);
  });

  it("é true quando nunca foi lido e existe comentário do cliente", () => {
    expect(hasUnreadClientComment(new Date("2026-08-20"), null)).toBe(true);
  });

  it("é true quando o comentário é mais recente que a última leitura", () => {
    expect(hasUnreadClientComment(new Date("2026-08-20"), new Date("2026-08-19"))).toBe(true);
  });

  it("é false quando a última leitura é mais recente que o comentário", () => {
    expect(hasUnreadClientComment(new Date("2026-08-19"), new Date("2026-08-20"))).toBe(false);
  });

  it("é false quando lido exatamente no mesmo instante do comentário", () => {
    const t = new Date("2026-08-20T10:00:00Z");
    expect(hasUnreadClientComment(t, t)).toBe(false);
  });
});

describe("getPaymentStatus", () => {
  it("é SEM_PAGAMENTO quando não há valor", () => {
    expect(getPaymentStatus(null, null, null)).toBe("SEM_PAGAMENTO");
  });

  it("é PAGO quando paidAt está preenchido, mesmo com prazo vencido", () => {
    expect(getPaymentStatus(100, new Date("2020-01-01"), new Date())).toBe("PAGO");
  });

  it("é ATRASADO quando o prazo de pagamento já passou e não foi pago", () => {
    expect(getPaymentStatus(100, new Date("2020-01-01"), null)).toBe("ATRASADO");
  });

  it("é PENDENTE quando tem valor mas ainda não venceu nem foi pago", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(getPaymentStatus(100, future, null)).toBe("PENDENTE");
  });

  it("é PENDENTE quando tem valor mas não tem data de pagamento definida", () => {
    expect(getPaymentStatus(100, null, null)).toBe("PENDENTE");
  });
});

describe("getProcessPaymentSummary", () => {
  it("é SEM_PAGAMENTO quando não há parcelas", () => {
    expect(getProcessPaymentSummary([])).toEqual({ status: "SEM_PAGAMENTO", totalValue: 0, paidCount: 0, totalCount: 0 });
  });

  it("é ATRASADO se qualquer parcela estiver atrasada, mesmo com outras pagas", () => {
    const result = getProcessPaymentSummary([
      { value: 100, paymentDueDate: new Date("2020-01-01"), paidAt: null },
      { value: 100, paymentDueDate: new Date("2020-01-01"), paidAt: new Date() },
    ]);
    expect(result.status).toBe("ATRASADO");
    expect(result.totalValue).toBe(200);
    expect(result.paidCount).toBe(1);
    expect(result.totalCount).toBe(2);
  });

  it("é PAGO só quando todas as parcelas estão pagas", () => {
    const result = getProcessPaymentSummary([
      { value: 100, paymentDueDate: null, paidAt: new Date() },
      { value: 50, paymentDueDate: null, paidAt: new Date() },
    ]);
    expect(result.status).toBe("PAGO");
    expect(result.paidCount).toBe(2);
  });

  it("é PENDENTE quando nenhuma está atrasada nem todas pagas", () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const result = getProcessPaymentSummary([
      { value: 100, paymentDueDate: future, paidAt: null },
      { value: 50, paymentDueDate: null, paidAt: new Date() },
    ]);
    expect(result.status).toBe("PENDENTE");
  });
});

describe("initials", () => {
  it("usa primeira e última palavra do nome", () => {
    expect(initials("Weverton Paranhos")).toBe("WP");
  });

  it("usa nome do meio junto quando há mais de duas palavras", () => {
    expect(initials("Ana Maria Souza")).toBe("AS");
  });

  it("usa as duas primeiras letras quando é uma palavra só", () => {
    expect(initials("Weverton")).toBe("WE");
  });

  it("retorna '?' pra nome vazio", () => {
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});

describe("isDueToday", () => {
  const now = new Date(2026, 8, 2, 15, 30);

  it("é false quando não há prazo", () => {
    expect(isDueToday(null, now)).toBe(false);
  });

  it("é true quando o prazo é hoje (UTC)", () => {
    expect(isDueToday(new Date(Date.UTC(2026, 8, 2)), now)).toBe(true);
  });

  it("é false quando o prazo é outro dia", () => {
    expect(isDueToday(new Date(Date.UTC(2026, 8, 3)), now)).toBe(false);
    expect(isDueToday(new Date(Date.UTC(2026, 8, 1)), now)).toBe(false);
  });
});
