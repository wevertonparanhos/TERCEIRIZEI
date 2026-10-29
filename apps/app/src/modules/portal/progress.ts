export type StageLite = { id: string; position: number };

/**
 * Progresso de uma tarefa pela etapa do quadro em que ela está: a 1ª etapa é 0% e a última é 100%.
 * (Quem organiza as etapas define o que cada passo significa; o % acompanha a posição.)
 */
export function stageProgress(stages: StageLite[], currentStageId: string): { percent: number; index: number; total: number } {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const index = sorted.findIndex((s) => s.id === currentStageId);
  if (index < 0 || sorted.length < 2) return { percent: 0, index: Math.max(index, 0), total: sorted.length };
  return { percent: Math.round((index / (sorted.length - 1)) * 100), index, total: sorted.length };
}
