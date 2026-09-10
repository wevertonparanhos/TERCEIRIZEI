import { describe, expect, it } from "vitest";
import { buildWhatsAppLink } from "./whatsapp";

describe("buildWhatsAppLink", () => {
  it("retorna null quando não há telefone", () => {
    expect(buildWhatsAppLink(null)).toBeNull();
    expect(buildWhatsAppLink(undefined)).toBeNull();
    expect(buildWhatsAppLink("")).toBeNull();
  });

  it("retorna null para número curto demais pra ser um telefone real", () => {
    expect(buildWhatsAppLink("123")).toBeNull();
  });

  it("prefixa 55 em número de 11 dígitos (DDD + celular, sem DDI)", () => {
    expect(buildWhatsAppLink("(31) 99999-8888")).toBe("https://wa.me/5531999998888");
  });

  it("prefixa 55 em número de 10 dígitos (DDD + fixo, sem DDI)", () => {
    expect(buildWhatsAppLink("31 3333-4444")).toBe("https://wa.me/553133334444");
  });

  it("não duplica o DDI quando o número já tem 12-13 dígitos", () => {
    expect(buildWhatsAppLink("+55 31 99999-8888")).toBe("https://wa.me/5531999998888");
  });

  it("trata DDD 55 (Rio Grande do Sul) sem confundir com DDI já presente", () => {
    // 11 dígitos: DDD 55 + celular de 9 dígitos, sem DDI — deve virar 13 dígitos (55 + 55 + 9)
    expect(buildWhatsAppLink("55991234567")).toBe("https://wa.me/5555991234567");
  });

  it("inclui a mensagem pré-preenchida, url-encoded", () => {
    expect(buildWhatsAppLink("31999998888", "Olá! Tudo bem?")).toBe(
      "https://wa.me/5531999998888?text=Ol%C3%A1!%20Tudo%20bem%3F"
    );
  });
});
