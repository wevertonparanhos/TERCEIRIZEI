export const LICENSE_TYPES = ["ALVARA", "CERTIDAO", "CERTIFICADO", "LICENCA", "OUTRO"] as const;
export type LicenseType = (typeof LICENSE_TYPES)[number];

export const LICENSE_TYPE_LABELS: Record<LicenseType, string> = {
  ALVARA: "Alvará",
  CERTIDAO: "Certidão",
  CERTIFICADO: "Certificado",
  LICENCA: "Licença",
  OUTRO: "Outro",
};

export const LICENSE_STATUSES = ["OK", "VENCE_EM_BREVE", "VENCIDO"] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export const LICENSE_STATUS_LABELS: Record<LicenseStatus, string> = {
  OK: "Em dia",
  VENCE_EM_BREVE: "Vence em breve",
  VENCIDO: "Vencido",
};

export const LICENSE_STATUS_BADGE_VARIANT: Record<LicenseStatus, "success" | "warning" | "danger"> = {
  OK: "success",
  VENCE_EM_BREVE: "warning",
  VENCIDO: "danger",
};

/** Status calculado (não armazenado) a partir do vencimento e da janela de
 * aviso — mesmo padrão "computado a cada leitura" usado por tarefas
 * recorrentes e presença neste projeto. */
export function getLicenseStatus(expiresAt: Date, reminderDaysBefore: number, now: Date = new Date()): LicenseStatus {
  if (expiresAt.getTime() < now.getTime()) return "VENCIDO";
  const reminderThreshold = new Date(expiresAt);
  reminderThreshold.setUTCDate(reminderThreshold.getUTCDate() - reminderDaysBefore);
  if (reminderThreshold.getTime() <= now.getTime()) return "VENCE_EM_BREVE";
  return "OK";
}

/** true quando o documento já entrou na janela de aviso (vence em breve ou
 * vencido) — usado tanto pro badge quanto pra decidir se já é hora de criar
 * a tarefa de renovação automática. */
export function isWithinReminderWindow(expiresAt: Date, reminderDaysBefore: number, now: Date = new Date()): boolean {
  return getLicenseStatus(expiresAt, reminderDaysBefore, now) !== "OK";
}
