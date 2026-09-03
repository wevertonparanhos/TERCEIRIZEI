export const DOCUMENT_CATEGORIES = [
  "DOCUMENTACAO_CADASTRAL",
  "CONTRATOS",
  "CERTIDOES",
  "DOCUMENTOS_SOCIETARIOS",
  "DOCUMENTOS_FISCAIS",
  "DOCUMENTOS_PESSOAIS",
  "COMPROVANTES",
  "OUTROS",
] as const;

export const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function validateUploadedFile(file: File) {
  if (file.size === 0) throw new Error("Selecione um arquivo.");
  if (file.size > MAX_UPLOAD_SIZE_BYTES) throw new Error("Arquivo maior que 20MB.");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Tipo de arquivo não permitido. Envie PDF, imagem, Word ou Excel.");
  }
}

export function sanitizeFileName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.-]/g, "_");
}
