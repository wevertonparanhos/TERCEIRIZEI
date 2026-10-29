import { describe, it, expect } from "vitest";
import { hexToRgbTriplet, portalSettingsSchema, questionSchema, softAccentTriplet } from "@/modules/portal/settings";

describe("configurações do portal", () => {
  it("converte a cor hexadecimal para o formato das variáveis de tema", () => {
    expect(hexToRgbTriplet("#14528D")).toBe("20 82 141");
    expect(hexToRgbTriplet("#ffffff")).toBe("255 255 255");
  });

  it("recusa cor inválida", () => {
    expect(hexToRgbTriplet("azul")).toBeNull();
    expect(hexToRgbTriplet("#12345")).toBeNull();
  });

  it("gera uma versão bem clara da cor para fundos", () => {
    const soft = softAccentTriplet("#14528D")!.split(" ").map(Number);
    expect(soft.every((n) => n >= 200 && n <= 255)).toBe(true);
  });

  it("valida a mensagem (até 500) e a cor", () => {
    expect(portalSettingsSchema.safeParse({ welcomeMessage: "x".repeat(501), accentColor: "#14528D", allowRequests: true }).success).toBe(false);
    expect(portalSettingsSchema.safeParse({ welcomeMessage: "Olá", accentColor: "vermelho", allowRequests: true }).success).toBe(false);
    const ok = portalSettingsSchema.parse({});
    expect(ok).toEqual({ welcomeMessage: "", accentColor: "#14528D", allowRequests: true, reviewRequests: true, allowApprovals: true });
  });
});

describe("perguntas do pedido", () => {
  it("exige o texto da pergunta e usa texto longo e opcional como padrão", () => {
    expect(questionSchema.safeParse({ label: "ab" }).success).toBe(false);
    expect(questionSchema.parse({ label: "Dados dos sócios" })).toEqual({ label: "Dados dos sócios", kind: "TEXTO_LONGO", required: false });
  });

  it("recusa tipo de resposta desconhecido", () => {
    expect(questionSchema.safeParse({ label: "Dados dos sócios", kind: "ARQUIVO" }).success).toBe(false);
  });
});
