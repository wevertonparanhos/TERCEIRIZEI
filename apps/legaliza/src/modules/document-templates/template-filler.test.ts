import { describe, it, expect } from "vitest";
import { buildTemplateData } from "./template-filler";

const baseInput = {
  client: { name: "[TESTE] Cliente Ltda", doc: "11222333000181", email: "cliente@teste.com" },
  company: {
    legalName: "[TESTE] Empresa LTDA",
    tradeName: "Empresa Teste",
    cnpj: "11222333000181",
    legalNature: "Sociedade Empresária Limitada",
    capital: 15000,
  },
  partner: { name: "[TESTE] Sócio", cpf: "11144477735", qualification: "Sócio Administrador" },
  address: {
    street: "Avenida Teste",
    number: "100",
    neighborhood: "Centro",
    city: "Belo Horizonte",
    state: "MG",
    cep: "30130010",
  },
  process: { type: "OPENING", state: "MG", municipality: "Belo Horizonte" },
};

describe("buildTemplateData", () => {
  it("preenche todas as variáveis quando todos os dados estão disponíveis", () => {
    const data = buildTemplateData(baseInput);
    expect(data.cliente_nome).toBe("[TESTE] Cliente Ltda");
    expect(data.empresa_razaoSocial).toBe("[TESTE] Empresa LTDA");
    expect(data.socio_nome).toBe("[TESTE] Sócio");
    expect(data.endereco_cidade).toBe("Belo Horizonte");
    expect(data.processo_uf).toBe("MG");
  });

  it("formata CNPJ com máscara (empresa e cliente PJ)", () => {
    const data = buildTemplateData(baseInput);
    expect(data.empresa_cnpj).toBe("11.222.333/0001-81");
    expect(data.cliente_doc).toBe("11.222.333/0001-81");
  });

  it("formata CPF com máscara (sócio)", () => {
    const data = buildTemplateData(baseInput);
    expect(data.socio_cpf).toBe("111.444.777-35");
  });

  it("formata capital social como moeda brasileira", () => {
    const data = buildTemplateData(baseInput);
    expect(data.empresa_capitalSocial).toBe("15.000,00");
  });

  it("traduz o tipo de processo (OPENING -> Abertura)", () => {
    const data = buildTemplateData(baseInput);
    expect(data.processo_tipo).toBe("Abertura");
  });

  it("deixa as variáveis de empresa vazias quando não há empresa (Abertura sem empresa ainda)", () => {
    const data = buildTemplateData({ ...baseInput, company: null });
    expect(data.empresa_razaoSocial).toBe("");
    expect(data.empresa_cnpj).toBe("");
    expect(data.empresa_capitalSocial).toBe("");
  });

  it("deixa as variáveis de sócio vazias quando não há sócio", () => {
    const data = buildTemplateData({ ...baseInput, partner: null });
    expect(data.socio_nome).toBe("");
    expect(data.socio_cpf).toBe("");
  });

  it("deixa as variáveis de endereço vazias quando não há endereço", () => {
    const data = buildTemplateData({ ...baseInput, address: null });
    expect(data.endereco_cidade).toBe("");
    expect(data.endereco_cep).toBe("");
  });

  it("gera data_hoje no formato dd/mm/aaaa", () => {
    const data = buildTemplateData(baseInput);
    expect(data.data_hoje).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });
});
