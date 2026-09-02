import { describe, it, expect } from "vitest";
import { groupChecklistItems } from "./checklist-grouping";

describe("groupChecklistItems", () => {
  it("agrupa itens pela categoria, preservando a ordem de primeira ocorrência", () => {
    const items = [
      { id: "1", category: "Principais" },
      { id: "2", category: "Documentos" },
      { id: "3", category: "Principais" },
      { id: "4", category: null },
      { id: "5", category: "Documentos" },
    ];
    const groups = groupChecklistItems(items);
    expect(groups.map((g) => g.category)).toEqual(["Principais", "Documentos", null]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["1", "3"]);
    expect(groups[1].items.map((i) => i.id)).toEqual(["2", "5"]);
    expect(groups[2].items.map((i) => i.id)).toEqual(["4"]);
  });

  it("retorna um único grupo null quando nenhum item tem categoria", () => {
    const items = [{ id: "1", category: null }, { id: "2", category: null }];
    const groups = groupChecklistItems(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBeNull();
    expect(groups[0].items).toHaveLength(2);
  });

  it("retorna array vazio pra lista vazia", () => {
    expect(groupChecklistItems([])).toEqual([]);
  });

  it("trata categorias com o mesmo nome como o mesmo grupo mesmo fora de ordem", () => {
    const items = [
      { id: "1", category: "A" },
      { id: "2", category: null },
      { id: "3", category: "A" },
    ];
    const groups = groupChecklistItems(items);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
  });
});
