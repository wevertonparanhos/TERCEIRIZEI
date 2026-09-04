import { describe, it, expect } from "vitest";
import { clientSchema } from "./client";

const valid = {
  name: "Cliente Contabilidade Ltda",
  type: "PJ" as const,
  doc: "11.222.333/0001-81",
  email: "cliente@example.com",
  status: "ativo" as const,
};

describe("clientSchema", () => {
  it("aceita um cliente PJ válido", () => {
    expect(clientSchema.safeParse(valid).success).toBe(true);
  });

  it("aceita um cliente PF válido com CPF", () => {
    const result = clientSchema.safeParse({ ...valid, type: "PF", doc: "111.444.777-35" });
    expect(result.success).toBe(true);
  });

  it("rejeita CNPJ com dígito verificador inválido", () => {
    const result = clientSchema.safeParse({ ...valid, doc: "11.222.333/0001-82" });
    expect(result.success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    const result = clientSchema.safeParse({ ...valid, email: "não-é-email" });
    expect(result.success).toBe(false);
  });

  it("rejeita nome muito curto", () => {
    const result = clientSchema.safeParse({ ...valid, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejeita status fora do enum", () => {
    const result = clientSchema.safeParse({ ...valid, status: "suspenso" });
    expect(result.success).toBe(false);
  });
});
