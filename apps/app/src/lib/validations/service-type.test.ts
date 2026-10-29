import { describe, it, expect } from "vitest";
import { serviceTypeSchema } from "./service-type";

describe("serviceTypeSchema", () => {
  it("aceita só o nome e aplica os padrões", () => {
    const r = serviceTypeSchema.parse({ name: "Abertura de empresa" });
    expect(r).toEqual({ name: "Abertura de empresa", defaultPrice: null, defaultDeadlineDays: null, defaultPriority: null, defaultNotes: "", active: true, checklist: [] });
  });

  it("recusa nome curto, valor negativo e prazo quebrado", () => {
    expect(serviceTypeSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(serviceTypeSchema.safeParse({ name: "Alvará", defaultPrice: -1 }).success).toBe(false);
    expect(serviceTypeSchema.safeParse({ name: "Alvará", defaultDeadlineDays: 2.5 }).success).toBe(false);
  });

  it("aceita prioridade válida e recusa desconhecida", () => {
    expect(serviceTypeSchema.safeParse({ name: "Alvará", defaultPriority: "ALTA" }).success).toBe(true);
    expect(serviceTypeSchema.safeParse({ name: "Alvará", defaultPriority: "MUITO" }).success).toBe(false);
  });

  it("limita e valida os itens do checklist", () => {
    expect(serviceTypeSchema.safeParse({ name: "Alvará", checklist: [{ label: "" }] }).success).toBe(false);
    expect(serviceTypeSchema.safeParse({ name: "Alvará", checklist: Array.from({ length: 61 }, () => ({ label: "x" })) }).success).toBe(false);
    expect(serviceTypeSchema.parse({ name: "Alvará", checklist: [{ label: "  Contrato social  " }] }).checklist[0].label).toBe("Contrato social");
  });
});
