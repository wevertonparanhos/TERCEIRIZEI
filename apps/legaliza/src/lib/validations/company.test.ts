import { describe, it, expect } from "vitest";
import { companySchema } from "./company";

const valid = {
  cnpj: "11.222.333/0001-81",
  legalName: "Padaria Pão Quente LTDA",
  status: "ativa" as const,
};

describe("companySchema", () => {
  it("aceita uma empresa válida só com os campos obrigatórios", () => {
    expect(companySchema.safeParse(valid).success).toBe(true);
  });

  it("aceita companySize dentro do enum oficial (MEI/ME/EPP/DEMAIS)", () => {
    expect(companySchema.safeParse({ ...valid, companySize: "MEI" }).success).toBe(true);
  });

  it("aceita companySize como string vazia (campo não preenchido no form)", () => {
    expect(companySchema.safeParse({ ...valid, companySize: "" }).success).toBe(true);
  });

  it("rejeita companySize fora do enum oficial", () => {
    expect(companySchema.safeParse({ ...valid, companySize: "GRANDE" }).success).toBe(false);
  });

  it("rejeita CNPJ inválido", () => {
    expect(companySchema.safeParse({ ...valid, cnpj: "00000000000000" }).success).toBe(false);
  });

  it("aceita CNPJ vazio (Abertura: CNPJ ainda não foi emitido pela Receita Federal)", () => {
    expect(companySchema.safeParse({ ...valid, cnpj: "" }).success).toBe(true);
  });

  it("aceita CNPJ ausente", () => {
    const { cnpj, ...withoutCnpj } = valid;
    expect(companySchema.safeParse(withoutCnpj).success).toBe(true);
  });

  it("rejeita razão social muito curta", () => {
    expect(companySchema.safeParse({ ...valid, legalName: "A" }).success).toBe(false);
  });

  it("rejeita status fora do enum", () => {
    expect(companySchema.safeParse({ ...valid, status: "suspensa" }).success).toBe(false);
  });
});
