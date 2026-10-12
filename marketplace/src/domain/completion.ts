import type { BookingStatus } from "./booking-state";

/**
 * Regra de negócio (definida pelo dono da plataforma em 2026-10-12):
 * o pagamento ao profissional só é liberado depois que ELE ENVIA FOTO/VÍDEO do
 * serviço finalizado E/OU O CLIENTE MARCA O SERVIÇO COMO CONCLUÍDO.
 *
 * Interpretação implementada:
 * - Profissional só consegue "finalizar" anexando ao menos 1 foto/vídeo.
 * - Cliente pode confirmar a conclusão (com ou sem evidência) após o horário do serviço.
 * - Se houve evidência e o cliente não confirmou nem contestou em
 *   AUTO_CONFIRM_HOURS, o sistema conclui (evita repasse preso para sempre).
 * - Repasse só para pedido COMPLETED (contestação/reembolso bloqueiam).
 */
export const AUTO_CONFIRM_HOURS = 48;
export const MIN_EVIDENCE_FILES = 1;

export type CompletionState = {
  status: BookingStatus;
  scheduledStart: Date;
  evidenceCount: number;
  /** Quando o profissional marcou como finalizado (com evidência). */
  providerFinishedAt: Date | null;
};

export type Decision = { ok: true } | { ok: false; reason: string };

export function canProviderFinish(s: CompletionState): Decision {
  if (s.status !== "IN_PROGRESS") return { ok: false, reason: "Só é possível finalizar um serviço em andamento." };
  if (s.evidenceCount < MIN_EVIDENCE_FILES) return { ok: false, reason: "Envie ao menos uma foto ou vídeo do serviço finalizado." };
  return { ok: true };
}

export function canCustomerConfirm(s: CompletionState, now = new Date()): Decision {
  if (!["CONFIRMED", "IN_PROGRESS", "COMPLETION_PENDING"].includes(s.status)) {
    return { ok: false, reason: "Este pedido não pode ser marcado como concluído." };
  }
  if (now < s.scheduledStart) return { ok: false, reason: "O serviço ainda não começou." };
  return { ok: true };
}

/** O sistema conclui sozinho só com evidência e após o prazo sem resposta do cliente. */
export function canAutoComplete(s: CompletionState, now = new Date()): Decision {
  if (s.status !== "COMPLETION_PENDING") return { ok: false, reason: "Pedido não está aguardando confirmação." };
  if (s.evidenceCount < MIN_EVIDENCE_FILES || !s.providerFinishedAt) return { ok: false, reason: "Sem foto/vídeo do serviço finalizado." };
  const deadline = s.providerFinishedAt.getTime() + AUTO_CONFIRM_HOURS * 3_600_000;
  if (now.getTime() < deadline) return { ok: false, reason: "Ainda dentro do prazo para o cliente confirmar ou contestar." };
  return { ok: true };
}

/** Repasse ao profissional: somente pedido concluído e sem contestação/reembolso em curso. */
export function canReleasePayout(status: BookingStatus): Decision {
  if (status === "COMPLETED") return { ok: true };
  if (status === "DISPUTED") return { ok: false, reason: "Pedido em contestação: repasse retido até a análise." };
  return { ok: false, reason: "Repasse liberado só após a conclusão confirmada do serviço." };
}
