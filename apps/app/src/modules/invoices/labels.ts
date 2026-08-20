export const STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  PAGA: "Paga",
  CANCELADA: "Cancelada",
  ATRASADA: "Atrasada",
};

export const STATUS_BADGE_VARIANT: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  PENDENTE: "warning",
  PAGA: "success",
  CANCELADA: "neutral",
  ATRASADA: "danger",
};

/** PENDENTE vira ATRASADA na exibição quando o vencimento já passou — não é
 * persistido no banco, evita depender de job agendado (Etapa 10). */
export function displayStatus(status: string, dueDate: Date): string {
  if (status === "PENDENTE" && dueDate.getTime() < Date.now()) return "ATRASADA";
  return status;
}
