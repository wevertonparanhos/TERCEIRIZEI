import { describe, it, expect } from "vitest";
import { serviceTypeNameSchema } from "./service-type";

describe("serviceTypeNameSchema", () => {
  it("aceita um nome e tira os espaços das pontas", () => {
    expect(serviceTypeNameSchema.parse("  Abertura de empresa  ")).toBe("Abertura de empresa");
  });

  it("recusa nome curto ou muito longo", () => {
    expect(serviceTypeNameSchema.safeParse("A").success).toBe(false);
    expect(serviceTypeNameSchema.safeParse("x".repeat(81)).success).toBe(false);
  });
});
