import { describe, expect, it } from "vitest";
import { isValidCnpj, isValidCpf, maskCpfCnpj, normalizeCpfCnpj, normalizePixKey } from "./documents";

describe("CPF/CNPJ", () => {
  it("valida dígitos verificadores", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCnpj("11.222.333/0001-80")).toBe(false);
  });

  it("normaliza e mascara", () => {
    expect(normalizeCpfCnpj("529.982.247-25")).toBe("52998224725");
    expect(normalizeCpfCnpj("123")).toBeNull();
    expect(maskCpfCnpj("52998224725")).toBe("***.982.247-**");
  });
});

describe("chave PIX", () => {
  it("aceita formatos válidos e normaliza", () => {
    expect(normalizePixKey("CPF", "529.982.247-25")).toBe("52998224725");
    expect(normalizePixKey("EMAIL", " Ana@Exemplo.com ")).toBe("ana@exemplo.com");
    expect(normalizePixKey("PHONE", "(31) 99999-8888")).toBe("+5531999998888");
    expect(normalizePixKey("EVP", "123e4567-e89b-12d3-a456-426614174000")).toBe("123e4567-e89b-12d3-a456-426614174000");
  });
  it("recusa chaves inválidas", () => {
    expect(normalizePixKey("CPF", "123")).toBeNull();
    expect(normalizePixKey("EMAIL", "nao-e-email")).toBeNull();
    expect(normalizePixKey("PHONE", "123")).toBeNull();
    expect(normalizePixKey("EVP", "abc")).toBeNull();
  });
});
