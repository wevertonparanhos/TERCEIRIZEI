import { describe, it, expect } from "vitest";
import { partnerSchema } from "./partner";

const valid = {
  name: "Sócio Administrador",
  cpf: "111.444.777-35",
  qualification: "Sócio Administrador",
  participationPercentage: 60,
};

describe("partnerSchema", () => {
  it("aceita um sócio válido", () => {
    expect(partnerSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita participação exatamente 100%", () => {
    expect(partnerSchema.safeParse({ ...valid, participationPercentage: 100 }).success).toBe(true);
  });

  it("rejeita participação acima de 100%", () => {
    expect(partnerSchema.safeParse({ ...valid, participationPercentage: 101 }).success).toBe(false);
  });

  it("rejeita participação zero ou negativa", () => {
    expect(partnerSchema.safeParse({ ...valid, participationPercentage: 0 }).success).toBe(false);
    expect(partnerSchema.safeParse({ ...valid, participationPercentage: -10 }).success).toBe(false);
  });

  it("coage participação vinda como string do formulário", () => {
    const result = partnerSchema.safeParse({ ...valid, participationPercentage: "60" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.participationPercentage).toBe(60);
  });

  it("rejeita CPF inválido", () => {
    expect(partnerSchema.safeParse({ ...valid, cpf: "111.444.777-36" }).success).toBe(false);
  });

  it("aceita e-mail vazio (opcional)", () => {
    expect(partnerSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
  });

  it("rejeita e-mail preenchido mas inválido", () => {
    expect(partnerSchema.safeParse({ ...valid, email: "não-é-email" }).success).toBe(false);
  });
});
