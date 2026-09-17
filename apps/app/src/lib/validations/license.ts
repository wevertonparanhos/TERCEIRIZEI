import { z } from "zod";
import { LICENSE_TYPES } from "@/modules/licenses/labels";

export const licenseDocumentSchema = z.object({
  clientId: z.string().min(1, "Selecione o cliente."),
  companyId: z.string().optional().or(z.literal("")),
  type: z.enum(LICENSE_TYPES),
  name: z.string().min(3, "Descreva o documento (ex.: Alvará de Funcionamento)."),
  issuingBody: z.string().optional(),
  documentNumber: z.string().optional(),
  issuedAt: z.string().optional().or(z.literal("")),
  expiresAt: z.string().min(1, "Informe a data de vencimento."),
  reminderDaysBefore: z.coerce.number().int().min(1).max(365).default(30),
  responsibleId: z.string().optional().or(z.literal("")),
  documentId: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});
export type LicenseDocumentInput = z.infer<typeof licenseDocumentSchema>;
