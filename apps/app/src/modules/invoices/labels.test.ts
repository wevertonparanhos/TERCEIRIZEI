import { describe, it, expect } from "vitest";
import { displayStatus } from "./labels";

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

describe("displayStatus", () => {
  it("vira ATRASADA quando pendente e o vencimento já passou", () => {
    expect(displayStatus("PENDENTE", daysFromNow(-5))).toBe("ATRASADA");
  });

  it("continua PENDENTE quando o vencimento ainda não chegou", () => {
    expect(displayStatus("PENDENTE", daysFromNow(5))).toBe("PENDENTE");
  });

  it("uma fatura PAGA nunca vira ATRASADA, mesmo com vencimento no passado", () => {
    expect(displayStatus("PAGA", daysFromNow(-5))).toBe("PAGA");
  });

  it("uma fatura CANCELADA nunca vira ATRASADA", () => {
    expect(displayStatus("CANCELADA", daysFromNow(-5))).toBe("CANCELADA");
  });
});
