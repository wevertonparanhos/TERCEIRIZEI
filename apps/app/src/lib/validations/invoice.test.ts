import { describe, it, expect } from "vitest";
import { invoiceSchema, invoiceItemSchema, markPaidSchema } from "./invoice";

describe("invoiceSchema", () => {
  it("aceita uma fatura válida", () => {
    const result = invoiceSchema.safeParse({ clientId: "client-1", dueDate: "2026-09-15" });
    expect(result.success).toBe(true);
  });

  it("rejeita sem cliente", () => {
    const result = invoiceSchema.safeParse({ clientId: "", dueDate: "2026-09-15" });
    expect(result.success).toBe(false);
  });

  it("rejeita sem vencimento", () => {
    const result = invoiceSchema.safeParse({ clientId: "client-1", dueDate: "" });
    expect(result.success).toBe(false);
  });
});

describe("invoiceItemSchema", () => {
  it("aceita um item válido", () => {
    const result = invoiceItemSchema.safeParse({ description: "Honorários", amount: "450.00" });
    expect(result.success).toBe(true);
  });

  it("converte o valor para number (z.coerce)", () => {
    const result = invoiceItemSchema.safeParse({ description: "Honorários", amount: "450.00" });
    if (result.success) expect(result.data.amount).toBe(450);
  });

  it("rejeita valor zero ou negativo", () => {
    expect(invoiceItemSchema.safeParse({ description: "Honorários", amount: "0" }).success).toBe(false);
    expect(invoiceItemSchema.safeParse({ description: "Honorários", amount: "-10" }).success).toBe(false);
  });

  it("rejeita descrição muito curta", () => {
    const result = invoiceItemSchema.safeParse({ description: "H", amount: "10" });
    expect(result.success).toBe(false);
  });
});

describe("markPaidSchema", () => {
  it("aceita um pagamento válido", () => {
    const result = markPaidSchema.safeParse({ paidAt: "2026-08-20", paymentMethod: "Pix" });
    expect(result.success).toBe(true);
  });

  it("rejeita sem forma de pagamento", () => {
    const result = markPaidSchema.safeParse({ paidAt: "2026-08-20", paymentMethod: "" });
    expect(result.success).toBe(false);
  });
});
