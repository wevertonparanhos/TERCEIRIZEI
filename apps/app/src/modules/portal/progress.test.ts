import { describe, it, expect } from "vitest";
import { stageKind, taskProgress } from "@/modules/portal/progress";

// Quadro "Principal" simplificado, com as etapas de pausa no fim como no sistema real.
const stages = [
  { id: "pend", label: "Pendência com o Cliente", position: 1 },
  { id: "nao", label: "Não Iniciadas", position: 2 },
  { id: "dbe", label: "DBE", position: 3 },
  { id: "org", label: "Em Analise no Orgão", position: 4 },
  { id: "alv", label: "Licenciamento/Alvarás", position: 5 },
  { id: "ok", label: "Concluído", position: 6 },
  { id: "par", label: "PARALISADAS", position: 7 },
  { id: "sus", label: "Suspensas", position: 8 },
];

describe("stageKind", () => {
  it("reconhece pausa, conclusão e etapas normais", () => {
    expect(stageKind("PARALISADAS")).toBe("pause");
    expect(stageKind("Suspensas")).toBe("pause");
    expect(stageKind("Pendência com o Cliente")).toBe("pause");
    expect(stageKind("Concluído")).toBe("done");
    expect(stageKind("CONCLUIDO")).toBe("done");
    expect(stageKind("RENOVADOS")).toBe("done");
    expect(stageKind("DBE")).toBe("step");
  });
});

describe("taskProgress", () => {
  it("a primeira etapa normal é 0% e Concluído é 100%, mesmo com etapas de pausa depois", () => {
    expect(taskProgress(stages, "nao").percent).toBe(0);
    const done = taskProgress(stages, "ok");
    expect(done.percent).toBe(100);
    expect(done.finished).toBe(true);
  });

  it("etapas intermediárias são proporcionais ao caminho (sem contar as pausas)", () => {
    // caminho: Não Iniciadas, DBE, Em Análise, Licenciamento, Concluído → 5 etapas
    expect(taskProgress(stages, "dbe").percent).toBe(25);
    expect(taskProgress(stages, "org").percent).toBe(50);
    expect(taskProgress(stages, "alv").percent).toBe(75);
  });

  it("tarefa em pausa mantém o % da última etapa normal por onde passou", () => {
    const p = taskProgress(stages, "par", ["nao", "dbe", "org", "par"]);
    expect(p.paused).toBe(true);
    expect(p.pauseLabel).toBe("PARALISADAS");
    expect(p.percent).toBe(50);
    expect(p.finished).toBe(false);
  });

  it("tarefa suspensa que nunca saiu do começo fica em 0%", () => {
    expect(taskProgress(stages, "sus", ["sus"]).percent).toBe(0);
  });

  it("as etapas de pausa não aparecem no caminho e Concluído fica por último", () => {
    const { path } = taskProgress(stages, "dbe");
    expect(path.map((s) => s.id)).toEqual(["nao", "dbe", "org", "alv", "ok"]);
  });

  it("etapa desconhecida não quebra", () => {
    expect(taskProgress(stages, "zzz").percent).toBe(0);
  });
});
