import { describe, it, expect } from "vitest";
import { activitySchema } from "./activity";

describe("activitySchema", () => {
  it("aceita uma atividade válida", () => {
    const result = activitySchema.safeParse({ cnae: "4721-1/02", description: "Padaria e confeitaria" });
    expect(result.success).toBe(true);
  });

  it("isPrimary é opcional e assume false por padrão", () => {
    const result = activitySchema.safeParse({ cnae: "4721-1/02", description: "Padaria e confeitaria" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.isPrimary).toBe(false);
  });

  it("rejeita CNAE vazio", () => {
    const result = activitySchema.safeParse({ cnae: "", description: "Padaria e confeitaria" });
    expect(result.success).toBe(false);
  });

  it("rejeita descrição muito curta", () => {
    const result = activitySchema.safeParse({ cnae: "4721-1/02", description: "P" });
    expect(result.success).toBe(false);
  });
});
