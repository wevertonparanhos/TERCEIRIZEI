import { z } from "zod";

export const PROTOCOL_STATUSES = [
  "SUBMITTED",
  "UNDER_ANALYSIS",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
] as const;

export const protocolSchema = z.object({
  governmentAgencyId: z.string().uuid("Selecione o órgão."),
  processStepId: z.string().uuid().optional().or(z.literal("")),
  protocolNumber: z.string().min(1, "Informe o número do protocolo."),
  url: z.string().url("URL inválida.").optional().or(z.literal("")),
  notes: z.string().optional(),
});
export type ProtocolInput = z.infer<typeof protocolSchema>;
