import { z } from "zod";

export const COMPLIANCE_ITEM_TYPES = ["CERTIDAO_NEGATIVA", "ALVARA", "CERTIFICADO_DIGITAL"] as const;

export const complianceItemSchema = z.object({
  type: z.enum(COMPLIANCE_ITEM_TYPES),
  name: z.string().min(2, "Informe o nome (ex: CND Federal, Alvará de Funcionamento)."),
  issuedAt: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  documentId: z.string().uuid().optional().or(z.literal("")),
  notes: z.string().optional(),
});
export type ComplianceItemInput = z.infer<typeof complianceItemSchema>;
