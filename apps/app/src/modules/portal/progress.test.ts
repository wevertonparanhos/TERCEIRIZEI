import { describe, it, expect } from "vitest";
import { stageProgress } from "@/modules/portal/progress";

const stages = [
  { id: "a", position: 0 },
  { id: "b", position: 1 },
  { id: "c", position: 2 },
  { id: "d", position: 3 },
  { id: "e", position: 4 },
];

describe("stageProgress", () => {
  it("primeira etapa é 0% e a última é 100%", () => {
    expect(stageProgress(stages, "a").percent).toBe(0);
    expect(stageProgress(stages, "e").percent).toBe(100);
  });

  it("etapas intermediárias são proporcionais à posição", () => {
    expect(stageProgress(stages, "c").percent).toBe(50);
    expect(stageProgress(stages, "b").percent).toBe(25);
  });

  it("ordena pela posição mesmo com a lista embaralhada", () => {
    const shuffled = [stages[3], stages[0], stages[4], stages[2], stages[1]];
    expect(stageProgress(shuffled, "d").percent).toBe(75);
  });

  it("etapa desconhecida ou quadro com uma etapa só não quebra", () => {
    expect(stageProgress(stages, "zzz").percent).toBe(0);
    expect(stageProgress([{ id: "x", position: 0 }], "x").percent).toBe(0);
  });
});
