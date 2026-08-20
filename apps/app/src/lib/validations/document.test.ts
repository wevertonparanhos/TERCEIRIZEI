import { describe, it, expect } from "vitest";
import { isValidCpfCnpj } from "./document";

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
