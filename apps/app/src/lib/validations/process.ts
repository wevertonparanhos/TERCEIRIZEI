import { z } from "zod";

export const DEMAND_PRIORITIES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;

export const TASK_STATUSES = ["A_FAZER", "EM_ANDAMENTO", "BLOQUEADA", "CONCLUIDA"] as const;

export const stageSchema = z.object({
  label: z.string().min(1, "Informe o nome da etapa."),
});
export type StageInput = z.infer<typeof stageSchema>;

export const processSchema = z.object({
  assigneeIds: z.array(z.string()).default([]),
  priority: z.enum(DEMAND_PRIORITIES),
  dueAt: z.string().optional(),
  visibleInPortal: z.boolean(),
  notes: z.string().optional(),
});
export type ProcessInput = z.infer<typeof processSchema>;

// Criação direta de processo (staff) — antes era "abrir demanda", hoje já
// nasce no Kanban (fusão Demanda/Processo).
export const createProcessSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente."),
  companyId: z.string().optional().or(z.literal("")),
  serviceTypeId: z.string().min(1, "Selecione o tipo de serviço."),
  description: z.string().min(5, "Descreva o processo."),
  priority: z.enum(DEMAND_PRIORITIES),
  value: z.string().optional(),
  paymentDueDate: z.string().optional(),
  requestedDeadline: z.string().optional(),
  notes: z.string().optional(),
});
export type CreateProcessInput = z.infer<typeof createProcessSchema>;

// Usado no Portal do Cliente — sem campo de cliente (é sempre o próprio usuário).
export const clientCreateProcessSchema = z.object({
  companyId: z.string().optional().or(z.literal("")),
  serviceTypeId: z.string().min(1, "Selecione o tipo de serviço."),
  description: z.string().min(5, "Descreva o que você precisa."),
  priority: z.enum(DEMAND_PRIORITIES),
  requestedDeadline: z.string().optional(),
  notes: z.string().optional(),
});
export type ClientCreateProcessInput = z.infer<typeof clientCreateProcessSchema>;

export const taskSchema = z.object({
  title: z.string().min(2, "Descreva a tarefa."),
  assigneeId: z.string().optional().or(z.literal("")),
  priority: z.enum(DEMAND_PRIORITIES),
  dueAt: z.string().optional(),
  notes: z.string().optional(),
});
export type TaskInput = z.infer<typeof taskSchema>;
