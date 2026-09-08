import { describe, it, expect } from "vitest";
import { complianceItemSchema } from "./compliance";

describe("complianceItemSchema", () => {
  it("aceita um item válido só com type e name", () => {
    const result = complianceItemSchema.safeParse({ type: "CERTIDAO_NEGATIVA", name: "CND Federal" });
    expect(result.success).toBe(true);
  });

  it("aceita expiresAt/issuedAt/documentId ausentes (todos opcionais)", () => {
    const result = complianceItemSchema.safeParse({ type: "ALVARA", name: "Alvará de Funcionamento" });
    expect(result.success).toBe(true);
  });

  it("rejeita type fora do enum", () => {
    const result = complianceItemSchema.safeParse({ type: "CERTIDAO_POSITIVA", name: "X" });
    expect(result.success).toBe(false);
  });

  it("rejeita nome muito curto", () => {
    const result = complianceItemSchema.safeParse({ type: "CERTIFICADO_DIGITAL", name: "A" });
    expect(result.success).toBe(false);
  });
});
