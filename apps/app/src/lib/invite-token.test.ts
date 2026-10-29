import { describe, it, expect } from "vitest";
import { buildInviteLink, createInviteToken, readInviteToken } from "./invite-token";

const secret = "segredo-de-teste";
const base = { userId: "11111111-1111-1111-1111-111111111111", fingerprint: "abc123", ttlHours: 24, secret, now: 1_000_000 };

describe("invite-token", () => {
  it("lê de volta o usuário e a impressão da senha", () => {
    const token = createInviteToken(base);
    expect(readInviteToken(token, secret, 1_000_001)).toEqual({ u: base.userId, f: "abc123", e: 1_000_000 + 24 * 3600 * 1000 });
  });

  it("recusa token vencido", () => {
    const token = createInviteToken(base);
    expect(readInviteToken(token, secret, 1_000_000 + 25 * 3600 * 1000)).toBeNull();
  });

  it("recusa token adulterado ou assinado com outro segredo", () => {
    const token = createInviteToken(base);
    const [body, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ u: "outro", e: 9e15, f: "abc123" })).toString("base64url");
    expect(readInviteToken(`${forged}.${sig}`, secret, 1_000_001)).toBeNull();
    expect(readInviteToken(`${body}.${sig}`, "outro-segredo", 1_000_001)).toBeNull();
  });

  it("recusa lixo", () => {
    expect(readInviteToken("", secret)).toBeNull();
    expect(readInviteToken("a.b.c", secret)).toBeNull();
    expect(readInviteToken("semponto", secret)).toBeNull();
  });

  it("monta o link da página de criar senha", () => {
    expect(buildInviteLink("https://app.exemplo.com", "tok")).toBe("https://app.exemplo.com/convite/tok");
  });
});
