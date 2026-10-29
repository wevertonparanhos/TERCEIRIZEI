import { describe, it, expect } from "vitest";
import { emptyContent, parseContent, subtotalOf, totalOf } from "@/modules/proposals/content";

describe("conteúdo da proposta", () => {
  it("modelo vazio ou incompleto vira conteúdo válido com padrões", () => {
    const c = parseContent({}, "Meu modelo");
    expect(c.title).toBe("Meu modelo");
    expect(c.items).toEqual([]);
    expect(c.validDays).toBe(15);
    expect(c.paymentStructure).toBe("AVISTA");
  });

  it("dados corrompidos caem no conteúdo em branco", () => {
    expect(parseContent({ items: "x" }, "Padrão").title).toBe("Padrão");
  });

  it("total desconta o desconto e nunca fica negativo", () => {
    const c = { ...emptyContent(), items: [{ description: "A", detail: "", value: 1000 }, { description: "B", detail: "", value: 500 }] };
    expect(subtotalOf(c)).toBe(1500);
    expect(totalOf({ ...c, discount: 300 })).toBe(1200);
    expect(totalOf({ ...c, discount: 9999 })).toBe(0);
  });
});
