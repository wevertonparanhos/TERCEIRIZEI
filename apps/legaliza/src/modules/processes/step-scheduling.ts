export type StepDuration = { estimatedDays: number | null };

// Extraído de generateProcessSteps (workflow-engine.ts) pra poder testar sem
// tocar no Prisma. Prazo cumulativo: dueDate da etapa N = dueDate da etapa
// N-1 + estimatedDays da etapa N (dias corridos). Etapa sem estimatedDays
// não avança o cursor, mas não reseta o valor acumulado pras próximas —
// bug real corrigido na Fase 4 (cada etapa calculava a partir do início do
// processo, não da etapa anterior).
export function computeCumulativeDueDates(steps: StepDuration[], startedAt: Date): (Date | null)[] {
  let cursor = startedAt;

  return steps.map((step) => {
    if (step.estimatedDays) {
      cursor = new Date(cursor.getTime() + step.estimatedDays * 24 * 60 * 60 * 1000);
      return cursor;
    }
    return null;
  });
}
