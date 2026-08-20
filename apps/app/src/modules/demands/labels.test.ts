import { describe, it, expect } from "vitest";
import { isDemandStale, STALE_DEMAND_DAYS } from "./labels";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe("isDemandStale", () => {
  it("é true quando a demanda está aberta e passou do limite de dias", () => {
    expect(isDemandStale("EM_ANALISE", daysAgo(STALE_DEMAND_DAYS + 1))).toBe(true);
  });

  it("é false quando a demanda mudou de status dentro do limite", () => {
    expect(isDemandStale("EM_ANALISE", daysAgo(STALE_DEMAND_DAYS - 1))).toBe(false);
  });

  it("é false para demanda concluída, mesmo parada há muito tempo", () => {
    expect(isDemandStale("CONCLUIDA", daysAgo(30))).toBe(false);
  });

  it("é false para demanda cancelada, mesmo parada há muito tempo", () => {
    expect(isDemandStale("CANCELADA", daysAgo(30))).toBe(false);
  });

  it("é false para uma demanda recém-criada", () => {
    expect(isDemandStale("NOVA", new Date())).toBe(false);
  });
});
