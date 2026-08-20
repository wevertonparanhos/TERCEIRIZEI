import { describe, it, expect } from "vitest";
import { clientSchema, clientContactSchema, companySchema } from "./client";

const validClient = {
  name: "Padaria Estrela Ltda",
  type: "PJ" as const,
  doc: "11.222.333/0001-81",
  email: "contato@padariaestrela.com",
  status: "ativo" as const,
};

describe("clientSchema", () => {
  it("aceita um cliente válido", () => {
    expect(clientSchema.safeParse(validClient).success).toBe(true);
  });

  it("rejeita CPF/CNPJ inválido", () => {
    const result = clientSchema.safeParse({ ...validClient, doc: "00000000000000" });
    expect(result.success).toBe(false);
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    const result = clientSchema.safeParse({ ...validClient, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    const result = clientSchema.safeParse({ ...validClient, email: "não-é-email" });
    expect(result.success).toBe(false);
  });

  it("aceita ownerUserId vazio (nenhum responsável)", () => {
    const result = clientSchema.safeParse({ ...validClient, ownerUserId: "" });
    expect(result.success).toBe(true);
  });

  it("rejeita ownerUserId que não é um uuid", () => {
    const result = clientSchema.safeParse({ ...validClient, ownerUserId: "não-é-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("clientContactSchema", () => {
  it("aceita um contato válido sem e-mail", () => {
    const result = clientContactSchema.safeParse({ name: "Maria Silva", role: "Financeiro" });
    expect(result.success).toBe(true);
  });

  it("rejeita contato sem papel", () => {
    const result = clientContactSchema.safeParse({ name: "Maria Silva", role: "" });
    expect(result.success).toBe(false);
  });
});

describe("companySchema", () => {
  const validCompany = {
    cnpj: "11.222.333/0001-81",
    razaoSocial: "Padaria Estrela Ltda",
    status: "ativa" as const,
  };

  it("aceita uma empresa válida", () => {
    expect(companySchema.safeParse(validCompany).success).toBe(true);
  });

  it("rejeita CPF no lugar de CNPJ (11 dígitos)", () => {
    const result = companySchema.safeParse({ ...validCompany, cnpj: "111.444.777-35" });
    expect(result.success).toBe(false);
  });
});
