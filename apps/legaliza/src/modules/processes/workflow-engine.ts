import { prisma, type ProcessType } from "@legaliza/db";

// Motor de regras simplificado (seção 22 do briefing): escolhe qual Workflow
// usar por tipo de processo + UF + natureza jurídica. Sem DSL de condição
// livre nem injeção dinâmica de etapa ainda — cada campo de uma Rule só pode
// bater exatamente ou ficar nulo ("qualquer valor"). Nunca inventa um
// workflow: se nenhuma regra bate, retorna null e o processo nasce sem
// etapas (staff monta manualmente).
export async function resolveWorkflow(
  tenantId: string,
  criteria: { processType: ProcessType; state: string; legalNature?: string | null }
): Promise<string | null> {
  const rules = await prisma.rule.findMany({
    where: {
      tenantId,
      active: true,
      processType: criteria.processType,
      OR: [{ state: null }, { state: criteria.state }],
      AND: criteria.legalNature
        ? { OR: [{ legalNature: null }, { legalNature: criteria.legalNature }] }
        : { legalNature: null },
    },
  });

  if (rules.length === 0) return null;

  const specificity = (r: (typeof rules)[number]) => (r.state ? 1 : 0) + (r.legalNature ? 1 : 0);
  rules.sort((a, b) => b.priority - a.priority || specificity(b) - specificity(a));

  return rules[0].workflowId;
}

// Copia as WorkflowStep ativas do workflow escolhido pra ProcessStep, na
// ordem certa. A primeira nasce READY, as demais PENDING. dueDate é
// cumulativo (prazo da etapa N = prazo da etapa N-1 + estimatedDays da etapa
// N) — senão toda etapa venceria a partir do início do processo, e a última
// etapa apareceria com prazo mais cedo que a primeira. Dias corridos, não
// úteis (cálculo de dias úteis/feriados fica pra seção 41, fase futura).
export async function generateProcessSteps(processId: string, workflowId: string, startedAt: Date): Promise<number> {
  const steps = await prisma.workflowStep.findMany({
    where: { workflowId },
    orderBy: { order: "asc" },
  });

  if (steps.length === 0) return 0;

  let cursor = startedAt;
  const data = steps.map((step, index) => {
    if (step.estimatedDays) {
      cursor = new Date(cursor.getTime() + step.estimatedDays * 24 * 60 * 60 * 1000);
    }
    return {
      processId,
      workflowStepId: step.id,
      name: step.name,
      description: step.description,
      order: step.order,
      status: index === 0 ? ("READY" as const) : ("PENDING" as const),
      dueDate: step.estimatedDays ? cursor : null,
    };
  });

  await prisma.processStep.createMany({ data });

  return steps.length;
}

// Gera o checklist automaticamente a partir das WorkflowStep marcadas como
// requiresDocument/requiresProtocol — 1 item por flag. Sem "condicional"
// ainda (só obrigatório), mesma simplificação documentada no schema.
export async function generateChecklist(processId: string, workflowId: string): Promise<number> {
  const steps = await prisma.workflowStep.findMany({
    where: { workflowId, OR: [{ requiresDocument: true }, { requiresProtocol: true }] },
    orderBy: { order: "asc" },
  });

  const items: { processId: string; label: string; required: boolean }[] = [];
  for (const step of steps) {
    if (step.requiresDocument) items.push({ processId, label: `Documento: ${step.name}`, required: true });
    if (step.requiresProtocol) items.push({ processId, label: `Protocolo: ${step.name}`, required: true });
  }

  if (items.length === 0) return 0;

  await prisma.checklistItem.createMany({ data: items });
  return items.length;
}
