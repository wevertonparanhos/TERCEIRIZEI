import { z } from "zod";
import { DEMAND_PRIORITIES } from "./demand";

export const TASK_STATUSES = ["A_FAZER", "EM_ANDAMENTO", "BLOQUEADA", "CONCLUIDA"] as const;

export const stageSchema = z.object({
  label: z.string().min(1, "Informe o nome da etapa."),
});
export type StageInput = z.infer<typeof stageSchema>;

export const processSchema = z.object({
  assignedUserId: z.string().optional().or(z.literal("")),
  priority: z.enum(DEMAND_PRIORITIES),
  value: z.string().optional(),
  dueAt: z.string().optional(),
  notes: z.string().optional(),
});
export type ProcessInput = z.infer<typeof processSchema>;

export const taskSchema = z.object({
  title: z.string().min(2, "Descreva a tarefa."),
  assigneeId: z.string().optional().or(z.literal("")),
  priority: z.enum(DEMAND_PRIORITIES),
  dueAt: z.string().optional(),
  notes: z.string().optional(),
});
export type TaskInput = z.infer<typeof taskSchema>;
