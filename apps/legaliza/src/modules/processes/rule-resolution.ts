export type RuleCandidate = {
  state: string | null;
  legalNature: string | null;
  priority: number;
  workflowId: string;
};

// Extraído de resolveWorkflow (workflow-engine.ts) pra poder testar sem
// tocar no Prisma. Escolhe a Rule vencedora entre as que já bateram no
// where (mesmo processType, state/legalNature iguais OU nulos): maior
// priority primeiro, empate resolvido por especificidade (nº de campos
// não-nulos, desc) — uma Rule com UF+natureza jurídica específicas vence
// uma genérica com a MESMA priority.
export function pickBestRule(rules: RuleCandidate[]): string | null {
  if (rules.length === 0) return null;

  const specificity = (r: RuleCandidate) => (r.state ? 1 : 0) + (r.legalNature ? 1 : 0);
  const sorted = [...rules].sort((a, b) => b.priority - a.priority || specificity(b) - specificity(a));

  return sorted[0].workflowId;
}
