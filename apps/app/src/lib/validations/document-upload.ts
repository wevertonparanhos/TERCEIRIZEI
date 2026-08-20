import { z } from "zod";

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

export const documentUploadSchema = z.object({
  name: z.string().min(2, "Informe o nome do documento."),
  category: z.enum(DOCUMENT_CATEGORIES),
});
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

export const documentRequestSchema = z.object({
  label: z.string().min(2, "Informe o documento solicitado."),
  deadline: z.string().optional(),
  notes: z.string().optional(),
});
export type DocumentRequestInput = z.infer<typeof documentRequestSchema>;

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
