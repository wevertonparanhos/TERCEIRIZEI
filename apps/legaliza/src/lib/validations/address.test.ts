import { describe, it, expect } from "vitest";
import { addressSchema } from "./address";

const valid = {
  cep: "30130-010",
  street: "Avenida Afonso Pena",
  number: "1000",
  neighborhood: "Centro",
  city: "Belo Horizonte",
  state: "MG",
};

describe("addressSchema", () => {
  it("aceita um endereço válido", () => {
    expect(addressSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita CEP com menos de 8 dígitos", () => {
    expect(addressSchema.safeParse({ ...valid, cep: "3013001" }).success).toBe(false);
  });

  it("rejeita UF com mais ou menos de 2 letras", () => {
    expect(addressSchema.safeParse({ ...valid, state: "M" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, state: "MGX" }).success).toBe(false);
  });

  it("rejeita logradouro vazio", () => {
    expect(addressSchema.safeParse({ ...valid, street: "" }).success).toBe(false);
  });

  it("aceita complemento ausente (opcional)", () => {
    expect(addressSchema.safeParse(valid).success).toBe(true);
  });
});
