import { describe, it, expect } from "vitest";
import { documentTemplateSchema } from "./document-template";

describe("documentTemplateSchema", () => {
  it("aceita um modelo válido só com name e category", () => {
    const result = documentTemplateSchema.safeParse({ name: "Procuração", category: "CONTRATOS" });
    expect(result.success).toBe(true);
  });

  it("aceita description ausente (opcional)", () => {
    const result = documentTemplateSchema.safeParse({ name: "Procuração", category: "OUTROS" });
    expect(result.success).toBe(true);
  });

  it("rejeita category fora do enum", () => {
    const result = documentTemplateSchema.safeParse({ name: "Procuração", category: "ALGO_INVENTADO" });
    expect(result.success).toBe(false);
  });

  it("rejeita nome muito curto", () => {
    const result = documentTemplateSchema.safeParse({ name: "A", category: "OUTROS" });
    expect(result.success).toBe(false);
  });
});
