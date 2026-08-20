import { describe, it, expect } from "vitest";
import { documentUploadSchema, documentRequestSchema } from "./document-upload";

describe("documentUploadSchema", () => {
  it("aceita um upload válido", () => {
    const result = documentUploadSchema.safeParse({ name: "Contrato social", category: "CONTRATOS" });
    expect(result.success).toBe(true);
  });

  it("rejeita categoria fora do enum", () => {
    const result = documentUploadSchema.safeParse({ name: "Contrato social", category: "OUTRA_COISA" });
    expect(result.success).toBe(false);
  });

  it("rejeita nome muito curto", () => {
    const result = documentUploadSchema.safeParse({ name: "A", category: "CONTRATOS" });
    expect(result.success).toBe(false);
  });
});

describe("documentRequestSchema", () => {
  it("aceita uma solicitação válida sem prazo", () => {
    const result = documentRequestSchema.safeParse({ label: "Certidão negativa de débitos" });
    expect(result.success).toBe(true);
  });

  it("rejeita rótulo muito curto", () => {
    const result = documentRequestSchema.safeParse({ label: "X" });
    expect(result.success).toBe(false);
  });
});
