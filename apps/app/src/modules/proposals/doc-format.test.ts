import { describe, it, expect } from "vitest";
import { formatDoc } from "@/modules/proposals/content";

describe("formatDoc", () => {
  it("formata CNPJ e CPF", () => {
    expect(formatDoc("50821759000103")).toBe("50.821.759/0001-03");
    expect(formatDoc("12345678901")).toBe("123.456.789-01");
  });
  it("mantém valores que não são CPF/CNPJ", () => {
    expect(formatDoc("ABC")).toBe("ABC");
  });
});
