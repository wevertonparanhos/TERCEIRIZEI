import { describe, it, expect } from "vitest";
import { buildConfirmLink, safeNextPath } from "@/lib/auth-links";

describe("link de acesso", () => {
  it("monta o link da rota /auth/confirm com o código, o tipo e o destino", () => {
    const link = buildConfirmLink("https://app.exemplo.com", "abc123");
    const url = new URL(link);
    expect(url.pathname).toBe("/auth/confirm");
    expect(url.searchParams.get("token_hash")).toBe("abc123");
    expect(url.searchParams.get("type")).toBe("recovery");
    expect(url.searchParams.get("next")).toBe("/redefinir-senha");
  });

  it("codifica caracteres especiais do código", () => {
    const url = new URL(buildConfirmLink("https://x.com", "a+b/c=d"));
    expect(url.searchParams.get("token_hash")).toBe("a+b/c=d");
  });

  it("só aceita destino interno", () => {
    expect(safeNextPath("/redefinir-senha")).toBe("/redefinir-senha");
    expect(safeNextPath("https://mal.com/x")).toBe("/");
    expect(safeNextPath("//mal.com")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath("sem-barra", "/login")).toBe("/login");
  });
});
