import { describe, it, expect } from "vitest";
import { isProcessOverdue } from "./labels";

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
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
