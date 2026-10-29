import { describe, it, expect } from "vitest";
import { taskTemplateSchema } from "./task-template";

describe("taskTemplateSchema", () => {
  it("aceita só o nome e aplica os padrões", () => {
    const r = taskTemplateSchema.parse({ name: "Abertura de empresa" });
    expect(r).toEqual({ name: "Abertura de empresa", defaultPrice: null, defaultDeadlineDays: null, defaultPriority: null, defaultNotes: "", active: true, checklist: [] });
  });

  it("recusa nome curto, valor negativo e prazo quebrado", () => {
    expect(taskTemplateSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(taskTemplateSchema.safeParse({ name: "Alvará", defaultPrice: -1 }).success).toBe(false);
    expect(taskTemplateSchema.safeParse({ name: "Alvará", defaultDeadlineDays: 2.5 }).success).toBe(false);
  });

  it("aceita prioridade válida e recusa desconhecida", () => {
    expect(taskTemplateSchema.safeParse({ name: "Alvará", defaultPriority: "ALTA" }).success).toBe(true);
    expect(taskTemplateSchema.safeParse({ name: "Alvará", defaultPriority: "MUITO" }).success).toBe(false);
  });

  it("limita e valida os itens do checklist", () => {
    expect(taskTemplateSchema.safeParse({ name: "Alvará", checklist: [{ label: "" }] }).success).toBe(false);
    expect(taskTemplateSchema.safeParse({ name: "Alvará", checklist: Array.from({ length: 61 }, () => ({ label: "x" })) }).success).toBe(false);
    expect(taskTemplateSchema.parse({ name: "Alvará", checklist: [{ label: "  Contrato social  " }] }).checklist[0].label).toBe("Contrato social");
  });
});
