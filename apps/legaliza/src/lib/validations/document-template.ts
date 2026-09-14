import { z } from "zod";
import { DOCUMENT_CATEGORIES } from "./document-upload";

export const documentTemplateSchema = z.object({
  name: z.string().min(2, "Informe o nome do modelo (ex: Procuração, Contrato Social)."),
  category: z.enum(DOCUMENT_CATEGORIES),
  description: z.string().optional(),
});
export type DocumentTemplateInput = z.infer<typeof documentTemplateSchema>;
