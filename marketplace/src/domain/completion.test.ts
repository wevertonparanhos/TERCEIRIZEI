import { describe, expect, it } from "vitest";
import { canTransition } from "./booking-state";
import { AUTO_CONFIRM_HOURS, canAutoComplete, canCustomerConfirm, canProviderFinish, canReleasePayout, type CompletionState } from "./completion";

const start = new Date("2026-10-20T12:00:00Z");
const base: CompletionState = { status: "IN_PROGRESS", scheduledStart: start, evidenceCount: 0, providerFinishedAt: null };
const after = (h: number, from = start) => new Date(from.getTime() + h * 3_600_000);

describe("conclusão e repasse (foto/vídeo e/ou confirmação do cliente)", () => {
  it("profissional só finaliza com pelo menos uma foto ou vídeo", () => {
    expect(canProviderFinish(base).ok).toBe(false);
    expect(canProviderFinish({ ...base, evidenceCount: 1 }).ok).toBe(true);
    expect(canProviderFinish({ ...base, status: "CONFIRMED", evidenceCount: 3 }).ok).toBe(false);
  });

  it("cliente confirma a conclusão mesmo sem evidência, mas não antes do horário", () => {
    expect(canCustomerConfirm({ ...base, status: "CONFIRMED" }, after(-1)).ok).toBe(false);
    expect(canCustomerConfirm({ ...base, status: "CONFIRMED" }, after(5)).ok).toBe(true);
    expect(canCustomerConfirm({ ...base, status: "COMPLETION_PENDING", evidenceCount: 2 }, after(5)).ok).toBe(true);
    expect(canCustomerConfirm({ ...base, status: "CANCELLED" }, after(5)).ok).toBe(false);
  });

  it("conclusão automática só com evidência e após o prazo sem resposta", () => {
    const finished = after(4);
    const pending: CompletionState = { ...base, status: "COMPLETION_PENDING", evidenceCount: 1, providerFinishedAt: finished };
    expect(canAutoComplete(pending, after(AUTO_CONFIRM_HOURS - 1, finished)).ok).toBe(false);
    expect(canAutoComplete(pending, after(AUTO_CONFIRM_HOURS, finished)).ok).toBe(true);
    expect(canAutoComplete({ ...pending, evidenceCount: 0 }, after(100, finished)).ok).toBe(false);
    expect(canAutoComplete({ ...pending, status: "DISPUTED" }, after(100, finished)).ok).toBe(false);
  });

  it("repasse só para pedido concluído; contestação retém", () => {
    expect(canReleasePayout("COMPLETED").ok).toBe(true);
    for (const s of ["CONFIRMED", "IN_PROGRESS", "COMPLETION_PENDING", "DISPUTED", "REFUND_PENDING", "CANCELLED"] as const) {
      expect(canReleasePayout(s).ok).toBe(false);
    }
  });

  it("máquina de estados permite o cliente concluir direto e o sistema só a partir da pendência", () => {
    expect(canTransition("IN_PROGRESS", "COMPLETED", "CUSTOMER")).toBe(true);
    expect(canTransition("CONFIRMED", "COMPLETED", "CUSTOMER")).toBe(true);
    expect(canTransition("COMPLETION_PENDING", "COMPLETED", "SYSTEM")).toBe(true);
    expect(canTransition("IN_PROGRESS", "COMPLETED", "SYSTEM")).toBe(false);
    expect(canTransition("IN_PROGRESS", "COMPLETED", "PROVIDER")).toBe(false); // profissional nunca conclui sozinho
  });
});
