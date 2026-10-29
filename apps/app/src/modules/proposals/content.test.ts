import { describe, it, expect } from "vitest";
import { emptyContent, parseContent } from "@/modules/proposals/content";
import { DEFAULT_CLAUSES, ensureMandatoryClauses, fillClause, vigenciaText } from "@/modules/proposals/contract-clauses";

describe("conteúdo da proposta", () => {
  it("modelo vazio ou incompleto vira conteúdo válido com padrões e todas as cláusulas", () => {
    const c = parseContent({}, "Meu modelo");
    expect(c.title).toBe("Meu modelo");
    expect(c.items).toEqual([]);
    expect(c.dueBusinessDay).toBe(5);
    expect(c.clauses.map((x) => x.key)).toEqual(DEFAULT_CLAUSES.map((x) => x.key));
  });

  it("dados corrompidos caem no conteúdo em branco", () => {
    expect(parseContent({ items: "x" }, "Padrão").title).toBe("Padrão");
  });

  it("proposta nova já vem com as cláusulas obrigatórias", () => {
    expect(emptyContent().clauses.every((c) => c.mandatory)).toBe(true);
  });
});

describe("cláusulas obrigatórias", () => {
  it("recoloca cláusula obrigatória removida e preserva o texto editado das demais", () => {
    const edited = DEFAULT_CLAUSES.filter((c) => c.key !== "foro").map((c) => (c.key === "objeto" ? { ...c, body: "Objeto editado." } : c));
    const result = ensureMandatoryClauses(edited);
    expect(result.some((c) => c.key === "foro")).toBe(true);
    expect(result.find((c) => c.key === "objeto")?.body).toBe("Objeto editado.");
  });

  it("restaura o texto padrão quando a cláusula obrigatória fica em branco", () => {
    const blank = DEFAULT_CLAUSES.map((c) => (c.key === "lgpd" ? { ...c, body: "   " } : c));
    expect(ensureMandatoryClauses(blank).find((c) => c.key === "lgpd")?.body).toBe(DEFAULT_CLAUSES.find((c) => c.key === "lgpd")?.body);
  });

  it("mantém cláusulas adicionais ao final e descarta as vazias", () => {
    const withCustom = [
      ...DEFAULT_CLAUSES,
      { key: "custom-1", title: "EXTRA", body: "Texto extra.", mandatory: false },
      { key: "custom-2", title: "VAZIA", body: " ", mandatory: false },
    ];
    const result = ensureMandatoryClauses(withCustom);
    expect(result[result.length - 1].key).toBe("custom-1");
    expect(result.some((c) => c.key === "custom-2")).toBe(false);
  });

  it("preenche as variáveis da cláusula de pagamento", () => {
    const pagamento = DEFAULT_CLAUSES.find((c) => c.key === "pagamento")!;
    const text = fillClause(pagamento.body, { diaVencimento: 5, multa: 2, juros: 1, aviso: 30, termMonths: null, foro: "Belo Horizonte/MG" });
    expect(text).toContain("até o 5º dia útil do mês seguinte");
    expect(text).not.toContain("{{");
  });

  it("vigência indeterminada ou determinada", () => {
    expect(vigenciaText(null)).toContain("prazo indeterminado");
    expect(vigenciaText(12)).toContain("12 meses");
  });
});

describe("revisão jurídica das cláusulas padrão", () => {
  const body = (key: string) => DEFAULT_CLAUSES.find((c) => c.key === key)!.body;

  it("o aceite digital se apoia na MP 2.200-2/2001 (a Lei 14.063/2020 não vale entre particulares)", () => {
    expect(body("aceite")).toContain("Medida Provisória nº 2.200-2/2001");
    expect(body("aceite")).not.toContain("14.063");
  });

  it("o atraso prevê multa única, juros simples e correção pelo IPCA", () => {
    const text = body("atraso");
    expect(text).toContain("aplicada uma única vez");
    expect(text).toContain("simples");
    expect(text).toContain("IPCA");
  });

  it("inclui reajuste, representação perante órgãos e comunicações como obrigatórias", () => {
    for (const key of ["reajuste", "representacao", "comunicacoes"]) {
      expect(DEFAULT_CLAUSES.find((c) => c.key === key)?.mandatory).toBe(true);
    }
  });

  it("a limitação de responsabilidade ressalva dolo e culpa grave", () => {
    expect(body("responsabilidade")).toContain("dolo ou culpa grave");
  });

  it("nenhuma variável fica sem preencher", () => {
    const vars = { diaVencimento: 5, multa: 2, juros: 1, aviso: 30, termMonths: 12, foro: "Belo Horizonte/MG" };
    for (const c of DEFAULT_CLAUSES) expect(fillClause(c.body, vars)).not.toContain("{{");
  });
});
