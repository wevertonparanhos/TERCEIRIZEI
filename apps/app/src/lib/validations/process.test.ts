import { describe, it, expect } from "vitest";
import { processSchema, taskSchema, createProcessSchema, clientCreateProcessSchema } from "./process";

describe("processSchema", () => {
  it("aceita um processo válido só com prioridade (demais campos opcionais)", () => {
    const result = processSchema.safeParse({ priority: "MEDIA" });
    expect(result.success).toBe(true);
  });

  it("rejeita prioridade fora do enum", () => {
    const result = processSchema.safeParse({ priority: "SUPER_URGENTE" });
    expect(result.success).toBe(false);
  });
});

describe("createProcessSchema", () => {
  const valid = {
    clientId: "client-1",
    serviceTypeId: "service-1",
    description: "Abertura de empresa para o cliente.",
    priority: "MEDIA" as const,
  };

  it("aceita um processo novo válido (staff)", () => {
    expect(createProcessSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita valor opcional", () => {
    expect(createProcessSchema.safeParse({ ...valid, value: "1500.00" }).success).toBe(true);
  });

  it("rejeita sem clientId", () => {
    expect(createProcessSchema.safeParse({ ...valid, clientId: "" }).success).toBe(false);
  });

  it("rejeita descrição muito curta", () => {
    expect(createProcessSchema.safeParse({ ...valid, description: "abc" }).success).toBe(false);
  });
});

describe("clientCreateProcessSchema", () => {
  it("aceita uma solicitação do portal sem clientId (implícito na sessão)", () => {
    const result = clientCreateProcessSchema.safeParse({
      serviceTypeId: "service-1",
      description: "Preciso de uma certidão negativa de débitos.",
      priority: "ALTA",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita sem tipo de serviço", () => {
    const result = clientCreateProcessSchema.safeParse({
      serviceTypeId: "",
      description: "Preciso de uma certidão negativa de débitos.",
      priority: "ALTA",
    });
    expect(result.success).toBe(false);
  });
});

describe("taskSchema", () => {
  it("aceita uma tarefa válida", () => {
    const result = taskSchema.safeParse({ title: "Enviar documentos", priority: "ALTA" });
    expect(result.success).toBe(true);
  });

  it("rejeita título muito curto", () => {
    const result = taskSchema.safeParse({ title: "X", priority: "ALTA" });
    expect(result.success).toBe(false);
  });
});
