import { z } from "zod";
import { PROCESS_TYPES } from "./process";

export const workflowSchema = z.object({
  name: z.string().min(2, "Informe o nome do workflow."),
  processType: z.enum(PROCESS_TYPES),
  state: z.string().optional(),
  legalNature: z.string().optional(),
});
export type WorkflowInput = z.infer<typeof workflowSchema>;

export const workflowStepSchema = z.object({
  name: z.string().min(2, "Informe o nome da etapa."),
  description: z.string().optional(),
  estimatedDays: z.coerce.number().int().min(0).optional(),
  responsibleRole: z.string().optional(),
  agencyName: z.string().optional(),
  requiresDocument: z.boolean().default(false),
  requiresProtocol: z.boolean().default(false),
  isAutomated: z.boolean().default(false),
});
export type WorkflowStepInput = z.infer<typeof workflowStepSchema>;
