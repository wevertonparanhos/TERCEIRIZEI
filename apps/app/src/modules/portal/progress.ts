export type StageInfo = { id: string; label: string; position: number; /** % definido pela equipe para esta etapa (vazio = calculado) */ progressPercent?: number | null };
export type StageKind = "pause" | "done" | "step";

const PAUSE = /paralis|suspens|pend[eê]ncia|parad|cancel/i;
const DONE = /conclu[ií]d|renovad|finaliz|entregue/i;

/** Etapa de pausa (Paralisadas, Suspensas, Pendência com o Cliente…), de conclusão (Concluído, Renovados…) ou normal. */
export function stageKind(label: string): StageKind {
  if (PAUSE.test(label)) return "pause";
  if (DONE.test(label)) return "done";
  return "step";
}

export type TaskProgress = {
  /** 0–100 */
  percent: number;
  /** etapas do caminho (sem as de pausa), com a de conclusão sempre por último */
  path: StageInfo[];
  /** posição da etapa atual (ou da última do caminho, se estiver em pausa) em `path`; -1 se nenhuma */
  currentIndex: number;
  paused: boolean;
  /** nome da etapa de pausa em que a tarefa está */
  pauseLabel: string | null;
  finished: boolean;
};

/**
 * Progresso de uma tarefa pelas etapas do quadro. As etapas de pausa não contam como andamento: a tarefa
 * mantém o % da última etapa normal por onde passou (`history` = ids das etapas em ordem cronológica).
 * A etapa de conclusão sempre vale 100%; a primeira etapa normal vale 0%.
 */
export function taskProgress(stages: StageInfo[], currentStageId: string, history: string[] = []): TaskProgress {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const steps = sorted.filter((s) => stageKind(s.label) === "step");
  const done = sorted.filter((s) => stageKind(s.label) === "done");
  const path = [...steps, ...done];

  const current = sorted.find((s) => s.id === currentStageId) ?? null;
  const paused = current ? stageKind(current.label) === "pause" : false;

  // Etapa que vale para o %: a atual, ou (em pausa) a última do caminho por onde a tarefa passou.
  let effective: StageInfo | null = current && !paused ? current : null;
  if (paused) {
    for (let i = history.length - 1; i >= 0; i--) {
      const found = path.find((s) => s.id === history[i]);
      if (found) {
        effective = found;
        break;
      }
    }
  }

  const currentIndex = effective ? path.findIndex((s) => s.id === effective!.id) : -1;
  const finished = !!effective && stageKind(effective.label) === "done";
  const automatic = !effective || currentIndex < 0 ? 0 : finished ? 100 : path.length < 2 ? 0 : Math.round((currentIndex / (path.length - 1)) * 100);
  // O % definido pela equipe para a etapa vale mais do que o cálculo automático.
  const configured = effective?.progressPercent;
  const percent = configured !== null && configured !== undefined ? Math.min(100, Math.max(0, Math.round(configured))) : automatic;

  return { percent, path, currentIndex, paused, pauseLabel: paused && current ? current.label : null, finished: finished || percent === 100 };
}
