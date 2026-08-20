export const CATEGORY_LABELS: Record<string, string> = {
  DOCUMENTACAO_CADASTRAL: "Documentação cadastral",
  CONTRATOS: "Contratos",
  CERTIDOES: "Certidões",
  DOCUMENTOS_SOCIETARIOS: "Documentos societários",
  DOCUMENTOS_FISCAIS: "Documentos fiscais",
  DOCUMENTOS_PESSOAIS: "Documentos pessoais",
  COMPROVANTES: "Comprovantes",
  OUTROS: "Outros",
};

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDENTE: "Pendente",
  RECEBIDO: "Recebido",
  CANCELADO: "Cancelado",
};

export const REQUEST_STATUS_VARIANT: Record<string, "neutral" | "success" | "warning" | "info"> = {
  PENDENTE: "warning",
  RECEBIDO: "success",
  CANCELADO: "neutral",
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
