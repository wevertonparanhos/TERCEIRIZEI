import { describe, it, expect } from "vitest";
import { isProcessOverdue, isProcessStale, STALE_PROCESS_DAYS } from "./labels";

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
