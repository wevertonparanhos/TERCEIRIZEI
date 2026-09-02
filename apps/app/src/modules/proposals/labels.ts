export const PROPOSAL_STATUSES = ["RASCUNHO", "ENVIADA", "ACEITA", "RECUSADA"] as const;
export type ProposalStatusValue = (typeof PROPOSAL_STATUSES)[number];

export type ProposalDisplayStatus = ProposalStatusValue | "EXPIRADA";

export const PROPOSAL_STATUS_LABELS: Record<ProposalDisplayStatus, string> = {
  RASCUNHO: "Rascunho",
  ENVIADA: "Enviada",
  ACEITA: "Aceita",
  RECUSADA: "Recusada",
  EXPIRADA: "Expirada",
};

export const PROPOSAL_STATUS_BADGE_VARIANT: Record<ProposalDisplayStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  RASCUNHO: "neutral",
  ENVIADA: "info",
  ACEITA: "success",
  RECUSADA: "danger",
  EXPIRADA: "warning",
};

/** ENVIADA com validade vencida exibe como "Expirada" — calculado em
 * runtime, não persistido (mesmo padrão de getPaymentStatus). */
export function getProposalDisplayStatus(
  status: ProposalStatusValue,
  validUntil: Date | null,
  now: Date = new Date()
): ProposalDisplayStatus {
  if (status === "ENVIADA" && validUntil && validUntil.getTime() < now.getTime()) return "EXPIRADA";
  return status;
}
