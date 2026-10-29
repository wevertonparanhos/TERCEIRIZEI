import { describe, expect, it } from "vitest";
import { matchesSearch, normalizeSearch } from "./search";

describe("busca de tarefas", () => {
  const task = ["274", "ABERTURA Trustpay", "LETICIA", "ABERTURA JUNTA", "Weverton Paranhos"];

  it("ignora acentos e maiúsculas", () => {
    expect(normalizeSearch("Alteração")).toBe("alteracao");
    expect(matchesSearch(["ALTERAÇÃO LUCAS BETTIN"], "alteracao")).toBe(true);
  });

  it("encontra por número, título, cliente e responsável", () => {
    expect(matchesSearch(task, "#274")).toBe(true);
    expect(matchesSearch(task, "trustpay")).toBe(true);
    expect(matchesSearch(task, "leticia")).toBe(true);
    expect(matchesSearch(task, "paranhos")).toBe(true);
  });

  it("exige todas as palavras digitadas", () => {
    expect(matchesSearch(task, "abertura leticia")).toBe(true);
    expect(matchesSearch(task, "abertura luiz")).toBe(false);
  });

  it("busca vazia mostra tudo", () => {
    expect(matchesSearch(task, "   ")).toBe(true);
  });
});
