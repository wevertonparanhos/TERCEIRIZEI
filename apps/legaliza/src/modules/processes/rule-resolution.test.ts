import { describe, it, expect } from "vitest";
import { pickBestRule } from "./rule-resolution";

describe("pickBestRule", () => {
  it("retorna null quando não há nenhuma regra", () => {
    expect(pickBestRule([])).toBeNull();
  });

  it("retorna o workflow da única regra existente", () => {
    const rules = [{ state: null, legalNature: null, priority: 0, workflowId: "generico" }];
    expect(pickBestRule(rules)).toBe("generico");
  });

  it("regra específica (UF+natureza) vence a genérica com a MESMA priority", () => {
    const rules = [
      { state: null, legalNature: null, priority: 0, workflowId: "generico" },
      { state: "MG", legalNature: "Sociedade Empresária Limitada", priority: 0, workflowId: "mg-ltda" },
    ];
    expect(pickBestRule(rules)).toBe("mg-ltda");
  });

  it("regra parcialmente específica (só UF) vence a genérica com a MESMA priority", () => {
    const rules = [
      { state: null, legalNature: null, priority: 0, workflowId: "generico" },
      { state: "MG", legalNature: null, priority: 0, workflowId: "mg" },
    ];
    expect(pickBestRule(rules)).toBe("mg");
  });

  it("priority maior vence mesmo sendo menos específica", () => {
    const rules = [
      { state: "MG", legalNature: "Sociedade Empresária Limitada", priority: 0, workflowId: "mg-ltda" },
      { state: null, legalNature: null, priority: 10, workflowId: "generico-prioritario" },
    ];
    expect(pickBestRule(rules)).toBe("generico-prioritario");
  });

  it("não muda o array original (não muta o argumento)", () => {
    const rules = [
      { state: null, legalNature: null, priority: 0, workflowId: "a" },
      { state: "MG", legalNature: null, priority: 0, workflowId: "b" },
    ];
    const original = [...rules];
    pickBestRule(rules);
    expect(rules).toEqual(original);
  });
});
