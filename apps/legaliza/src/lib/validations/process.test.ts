import { describe, it, expect } from "vitest";
import { processSchema } from "./process";

const base = {
  clientId: "11111111-1111-1111-1111-111111111111",
  type: "OPENING" as const,
  priority: "MEDIA" as const,
  state: "MG",
  municipality: "Belo Horizonte",
};

describe("processSchema", () => {
  it("aceita OPENING sem companyId (a empresa ainda não existe)", () => {
    const result = processSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("rejeita AMENDMENT sem companyId", () => {
    const result = processSchema.safeParse({ ...base, type: "AMENDMENT" });
    expect(result.success).toBe(false);
  });

  it("rejeita TRANSFORMATION sem companyId", () => {
    const result = processSchema.safeParse({ ...base, type: "TRANSFORMATION" });
    expect(result.success).toBe(false);
  });

  it("rejeita CLOSURE sem companyId", () => {
    const result = processSchema.safeParse({ ...base, type: "CLOSURE" });
    expect(result.success).toBe(false);
  });

  it("aceita AMENDMENT com companyId preenchido", () => {
    const result = processSchema.safeParse({
      ...base,
      type: "AMENDMENT",
      companyId: "22222222-2222-2222-2222-222222222222",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita UF com comprimento diferente de 2", () => {
    const result = processSchema.safeParse({ ...base, state: "MGX" });
    expect(result.success).toBe(false);
  });

  it("rejeita tipo de processo fora do enum", () => {
    const result = processSchema.safeParse({ ...base, type: "RENOVACAO" });
    expect(result.success).toBe(false);
  });

  it("desiredLegalNature é opcional", () => {
    const result = processSchema.safeParse(base);
    expect(result.success).toBe(true);
  });
});
