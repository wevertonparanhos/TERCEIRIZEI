import { describe, it, expect } from "vitest";
import { demandSchema, clientDemandSchema } from "./demand";

describe("demandSchema", () => {
  const valid = {
    clientId: "client-1",
    serviceTypeId: "service-1",
    description: "Abertura de empresa para o cliente.",
    priority: "MEDIA" as const,
  };

  it("aceita uma demanda válida (staff)", () => {
    expect(demandSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita sem clientId", () => {
    const result = demandSchema.safeParse({ ...valid, clientId: "" });
    expect(result.success).toBe(false);
  });

  it("rejeita descrição muito curta", () => {
    const result = demandSchema.safeParse({ ...valid, description: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejeita prioridade fora do enum", () => {
    const result = demandSchema.safeParse({ ...valid, priority: "URGENTISSIMA" });
    expect(result.success).toBe(false);
  });
});

describe("clientDemandSchema", () => {
  it("aceita uma demanda do portal sem clientId (implícito na sessão)", () => {
    const result = clientDemandSchema.safeParse({
      serviceTypeId: "service-1",
      description: "Preciso de uma certidão negativa de débitos.",
      priority: "ALTA",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita sem tipo de serviço", () => {
    const result = clientDemandSchema.safeParse({
      serviceTypeId: "",
      description: "Preciso de uma certidão negativa de débitos.",
      priority: "ALTA",
    });
    expect(result.success).toBe(false);
  });
});
