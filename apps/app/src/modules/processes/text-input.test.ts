import { describe, it, expect } from "vitest";
import { excerptOf, normalizeTitle, parseMoneyInput } from "./text-input";

describe("parseMoneyInput", () => {
  it("aceita vírgula decimal, ponto de milhar e número simples", () => {
    expect(parseMoneyInput("250,00")).toBe(250);
    expect(parseMoneyInput("1.500,50")).toBe(1500.5);
    expect(parseMoneyInput("150")).toBe(150);
    expect(parseMoneyInput("150.5")).toBe(150.5);
    expect(parseMoneyInput(" 99,9 ")).toBe(99.9);
  });

  it("recusa vazio, zero, negativo e texto", () => {
    expect(parseMoneyInput("")).toBeNull();
    expect(parseMoneyInput("0")).toBeNull();
    expect(parseMoneyInput("-10")).toBeNull();
    expect(parseMoneyInput("abc")).toBeNull();
    expect(parseMoneyInput(null)).toBeNull();
  });
});

describe("normalizeTitle", () => {
  it("só reduz espaços repetidos e não mexe nas letras", () => {
    expect(normalizeTitle("  Alteração   de   sócios  ")).toBe("Alteração de sócios");
    expect(normalizeTitle("sssss")).toBe("sssss");
  });
});

describe("excerptOf", () => {
  it("junta em uma linha e corta com reticências", () => {
    expect(excerptOf("linha 1\n\n  linha 2")).toBe("linha 1 linha 2");
    expect(excerptOf("a".repeat(100), 10)).toBe("aaaaaaaaaa…");
  });
});
