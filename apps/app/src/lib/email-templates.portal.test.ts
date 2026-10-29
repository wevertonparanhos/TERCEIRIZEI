import { describe, it, expect } from "vitest";
import { portalAccessEmail } from "@/lib/email-templates";

describe("e-mail de acesso ao portal", () => {
  const link = "https://app.exemplo.com/auth/callback?token=abc";

  it("convite: assunto, botão e link", () => {
    const { subject, html } = portalAccessEmail({ clientName: "ACONT", link, mode: "invite" });
    expect(subject).toContain("acesso ao Portal");
    expect(html).toContain("Criar minha senha");
    expect(html).toContain(link);
  });

  it("redefinição: assunto e botão próprios", () => {
    const { subject, html } = portalAccessEmail({ clientName: "ACONT", link, mode: "reset" });
    expect(subject).toContain("Redefinir");
    expect(html).toContain("Criar nova senha");
    expect(html).toContain("Se não foi você");
  });
});
