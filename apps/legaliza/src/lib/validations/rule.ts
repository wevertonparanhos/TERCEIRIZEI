import { z } from "zod";
import { PROCESS_TYPES } from "./process";

export const ruleSchema = z.object({
  name: z.string().min(2, "Informe o nome da regra."),
  processType: z.enum(PROCESS_TYPES),
  state: z.string().optional(),
  legalNature: z.string().optional(),
  workflowId: z.string().uuid("Selecione o workflow."),
  priority: z.coerce.number().int().default(0),
});
export type RuleInput = z.infer<typeof ruleSchema>;
