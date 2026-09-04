import { describe, it, expect } from "vitest";
import { amendmentSchema, AMENDMENT_ASPECTS } from "./amendment";

const base = {
  clientId: "11111111-1111-1111-1111-111111111111",
  companyId: "22222222-2222-2222-2222-222222222222",
  state: "MG",
  municipality: "Belo Horizonte",
  priority: "MEDIA" as const,
};

describe("amendmentSchema", () => {
  it("aceita quando pelo menos 1 aspecto está marcado", () => {
    const result = amendmentSchema.safeParse({ ...base, aspects: ["Endereço"] });
    expect(result.success).toBe(true);
  });

  it("aceita múltiplos aspectos marcados", () => {
    const result = amendmentSchema.safeParse({ ...base, aspects: ["Endereço", "CNAE", "Capital"] });
    expect(result.success).toBe(true);
  });

  it("rejeita quando nenhum aspecto está marcado (mesmo erro visto ao vivo na Fase 7)", () => {
    const result = amendmentSchema.safeParse({ ...base, aspects: [] });
    expect(result.success).toBe(false);
  });

  it("rejeita aspecto fora da lista fixa da seção 54", () => {
    const result = amendmentSchema.safeParse({ ...base, aspects: ["Logo da Empresa"] });
    expect(result.success).toBe(false);
  });

  it("rejeita sem empresa selecionada", () => {
    const result = amendmentSchema.safeParse({ ...base, companyId: "", aspects: ["Endereço"] });
    expect(result.success).toBe(false);
  });

  it("a lista de aspectos tem os 11 itens da seção 54, sem duplicata", () => {
    expect(AMENDMENT_ASPECTS.length).toBe(11);
    expect(new Set(AMENDMENT_ASPECTS).size).toBe(AMENDMENT_ASPECTS.length);
  });
});
