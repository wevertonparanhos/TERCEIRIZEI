import { z } from "zod";
import { DEMAND_PRIORITIES } from "./process";

export const serviceTypeSchema = z.object({
  name: z.string().min(2, "Informe o nome do modelo."),
  defaultPrice: z.string().optional(),
  defaultDeadlineDays: z.string().optional(),
  defaultPriority: z.enum(DEMAND_PRIORITIES).optional().or(z.literal("")),
  defaultNotes: z.string().optional(),
});
export type ServiceTypeInput = z.infer<typeof serviceTypeSchema>;

export const checklistTemplateItemSchema = z.object({
  label: z.string().min(2, "Descreva o item do checklist."),
  category: z.string().optional(),
});
export type ChecklistTemplateItemInput = z.infer<typeof checklistTemplateItemSchema>;
