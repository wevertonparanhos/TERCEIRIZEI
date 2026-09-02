import { describe, it, expect } from "vitest";
import { hasUnreadMessage } from "@/modules/chat/labels";

describe("hasUnreadMessage", () => {
  it("é false quando não há mensagem", () => {
    expect(hasUnreadMessage(null, new Date("2026-08-01"))).toBe(false);
  });

  it("é true quando nunca foi lido e existe mensagem", () => {
    expect(hasUnreadMessage(new Date("2026-08-20"), null)).toBe(true);
  });

  it("é true quando a mensagem é mais recente que a última leitura", () => {
    expect(hasUnreadMessage(new Date("2026-08-20"), new Date("2026-08-19"))).toBe(true);
  });

  it("é false quando a última leitura é mais recente que a mensagem", () => {
    expect(hasUnreadMessage(new Date("2026-08-19"), new Date("2026-08-20"))).toBe(false);
  });

  it("é false quando lido exatamente no mesmo instante da mensagem", () => {
    const t = new Date("2026-08-20T10:00:00Z");
    expect(hasUnreadMessage(t, t)).toBe(false);
  });
});
