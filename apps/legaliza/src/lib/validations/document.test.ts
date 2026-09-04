import { describe, it, expect } from "vitest";
import { isValidCpfCnpj, isValidCpfOnly, isValidCnpjOnly, isValidCepFormat } from "./document";

describe("isValidCpfCnpj", () => {
  it("aceita CPF válido sem máscara", () => {
    expect(isValidCpfCnpj("11144477735")).toBe(true);
  });

  it("aceita CPF válido com máscara", () => {
    expect(isValidCpfCnpj("111.444.777-35")).toBe(true);
  });

  it("aceita CNPJ válido sem máscara", () => {
    expect(isValidCpfCnpj("11222333000181")).toBe(true);
  });

  it("aceita CNPJ válido com máscara", () => {
    expect(isValidCpfCnpj("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita CPF com dígito verificador incorreto", () => {
    expect(isValidCpfCnpj("11144477736")).toBe(false);
  });

  it("rejeita CNPJ com dígito verificador incorreto", () => {
    expect(isValidCpfCnpj("11222333000182")).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    expect(isValidCpfCnpj("11111111111")).toBe(false);
  });

  it("rejeita CNPJ com todos os dígitos iguais", () => {
    expect(isValidCpfCnpj("11111111111111")).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(isValidCpfCnpj("")).toBe(false);
  });

  it("rejeita comprimento que não é nem CPF (11) nem CNPJ (14)", () => {
    expect(isValidCpfCnpj("123456789")).toBe(false);
    expect(isValidCpfCnpj("123456789012345")).toBe(false);
  });
});

describe("isValidCpfOnly", () => {
  it("aceita CPF válido", () => {
    expect(isValidCpfOnly("111.444.777-35")).toBe(true);
  });

  it("rejeita CNPJ mesmo que seja válido como CNPJ", () => {
    expect(isValidCpfOnly("11.222.333/0001-81")).toBe(false);
  });
});

describe("isValidCnpjOnly", () => {
  it("aceita CNPJ válido", () => {
    expect(isValidCnpjOnly("11.222.333/0001-81")).toBe(true);
  });

  it("rejeita CPF mesmo que seja válido como CPF", () => {
    expect(isValidCnpjOnly("111.444.777-35")).toBe(false);
  });
});

describe("isValidCepFormat", () => {
  it("aceita 8 dígitos sem máscara", () => {
    expect(isValidCepFormat("30130010")).toBe(true);
  });

  it("aceita 8 dígitos com máscara", () => {
    expect(isValidCepFormat("30130-010")).toBe(true);
  });

  it("rejeita menos de 8 dígitos", () => {
    expect(isValidCepFormat("3013001")).toBe(false);
  });

  it("rejeita mais de 8 dígitos", () => {
    expect(isValidCepFormat("301300100")).toBe(false);
  });
});
