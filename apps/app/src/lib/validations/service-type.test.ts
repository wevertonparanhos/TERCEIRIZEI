import { describe, it, expect } from "vitest";
import { serviceTypeSchema, checklistTemplateItemSchema } from "./service-type";

describe("serviceTypeSchema", () => {
  it("aceita um modelo só com nome (demais campos opcionais)", () => {
    expect(serviceTypeSchema.safeParse({ name: "Abertura de empresa" }).success).toBe(true);
  });

  it("aceita um modelo completo", () => {
    const result = serviceTypeSchema.safeParse({
      name: "Abertura de empresa",
      defaultPrice: "1200.00",
      defaultDeadlineDays: "10",
      defaultPriority: "ALTA",
      defaultNotes: "Confirmar CNAE antes de abrir.",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome muito curto", () => {
    expect(serviceTypeSchema.safeParse({ name: "A" }).success).toBe(false);
  });

  it("rejeita prioridade fora do enum", () => {
    expect(serviceTypeSchema.safeParse({ name: "Abertura de empresa", defaultPriority: "SUPER_URGENTE" }).success).toBe(
      false
    );
  });
});

describe("checklistTemplateItemSchema", () => {
  it("aceita um item válido", () => {
    expect(checklistTemplateItemSchema.safeParse({ label: "Verificar contrato social" }).success).toBe(true);
  });

  it("rejeita item muito curto", () => {
    expect(checklistTemplateItemSchema.safeParse({ label: "X" }).success).toBe(false);
  });
});
