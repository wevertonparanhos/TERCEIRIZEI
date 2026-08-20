import { describe, it, expect } from "vitest";
import { processSchema, taskSchema } from "./process";

describe("processSchema", () => {
  it("aceita um processo válido só com prioridade (demais campos opcionais)", () => {
    const result = processSchema.safeParse({ priority: "MEDIA" });
    expect(result.success).toBe(true);
  });

  it("rejeita prioridade fora do enum", () => {
    const result = processSchema.safeParse({ priority: "SUPER_URGENTE" });
    expect(result.success).toBe(false);
  });
});

describe("taskSchema", () => {
  it("aceita uma tarefa válida", () => {
    const result = taskSchema.safeParse({ title: "Enviar documentos", priority: "ALTA" });
    expect(result.success).toBe(true);
  });

  it("rejeita título muito curto", () => {
    const result = taskSchema.safeParse({ title: "X", priority: "ALTA" });
    expect(result.success).toBe(false);
  });
});
