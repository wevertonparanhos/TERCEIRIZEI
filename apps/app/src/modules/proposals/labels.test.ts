import { describe, it, expect } from "vitest";
import { getProposalDisplayStatus } from "@/modules/proposals/labels";

describe("getProposalDisplayStatus", () => {
  const now = new Date(2026, 8, 2);

  it("mantém RASCUNHO como está, mesmo sem validade", () => {
    expect(getProposalDisplayStatus("RASCUNHO", null, now)).toBe("RASCUNHO");
  });

  it("mantém ENVIADA quando a validade ainda não passou", () => {
    expect(getProposalDisplayStatus("ENVIADA", new Date(2026, 8, 10), now)).toBe("ENVIADA");
  });

  it("mantém ENVIADA quando não há validade definida", () => {
    expect(getProposalDisplayStatus("ENVIADA", null, now)).toBe("ENVIADA");
  });

  it("vira EXPIRADA quando ENVIADA e a validade já passou", () => {
    expect(getProposalDisplayStatus("ENVIADA", new Date(2026, 7, 20), now)).toBe("EXPIRADA");
  });

  it("não expira ACEITA mesmo com validade vencida", () => {
    expect(getProposalDisplayStatus("ACEITA", new Date(2026, 7, 20), now)).toBe("ACEITA");
  });

  it("não expira RECUSADA mesmo com validade vencida", () => {
    expect(getProposalDisplayStatus("RECUSADA", new Date(2026, 7, 20), now)).toBe("RECUSADA");
  });
});
