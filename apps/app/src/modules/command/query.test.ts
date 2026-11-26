import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "./query";

describe("busca geral", () => {
  it("ignora vazio e texto curto demais", () => {
    expect(parseSearchQuery("")).toBeNull();
    expect(parseSearchQuery("   ")).toBeNull();
    expect(parseSearchQuery("a")).toBeNull();
    expect(parseSearchQuery("#")).toBeNull();
  });

  it("#número procura só a tarefa", () => {
    expect(parseSearchQuery("#269")).toEqual({ text: "", number: 269, digits: "269" });
    expect(parseSearchQuery("# 7")).toEqual({ text: "", number: 7, digits: null });
  });

  it("número sem # procura tarefa e texto", () => {
    expect(parseSearchQuery("269")).toEqual({ text: "269", number: 269, digits: "269" });
    expect(parseSearchQuery("5")).toEqual({ text: "5", number: 5, digits: null });
  });

  it("documento formatado vira dígitos", () => {
    expect(parseSearchQuery("12.345.678/0001-90")).toEqual({ text: "12.345.678/0001-90", number: null, digits: "12345678000190" });
  });

  it("texto livre procura nomes, sem número", () => {
    expect(parseSearchQuery("  soul   pet ")).toEqual({ text: "soul pet", number: null, digits: null });
    expect(parseSearchQuery("Alteração 2")).toEqual({ text: "Alteração 2", number: null, digits: null });
  });
});
