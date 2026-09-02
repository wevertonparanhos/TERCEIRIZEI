import { z } from "zod";
import { FREQUENCIES } from "@/modules/recurring-tasks/labels";

export const recurringTaskSchema = z.object({
  title: z.string().min(3, "Descreva a tarefa recorrente."),
  assigneeId: z.string().optional().or(z.literal("")),
  frequency: z.enum(FREQUENCIES),
  nextDueAt: z.string().min(1, "Informe a próxima data prevista."),
  notes: z.string().optional(),
});
export type RecurringTaskInput = z.infer<typeof recurringTaskSchema>;
