import { z } from "zod";

export const DEMAND_PRIORITIES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;

export const stageSchema = z.object({
  label: z.string().min(1, "Informe o nome da etapa."),
});
export type StageInput = z.infer<typeof stageSchema>;

export const processSchema = z.object({
  assigneeIds: z.array(z.string()).default([]),
  priority: z.enum(DEMAND_PRIORITIES),
  dueAt: z.string().optional(),
  // Cronograma — pares previsto/real de início e entrega (dueAt já é a
  // "Prev. conclusão"); "Conclusão real" também mora aqui.
  plannedStartAt: z.string().optional(),
  actualStartAt: z.string().optional(),
  actualCompletionAt: z.string().optional(),
  plannedDeliveryAt: z.string().optional(),
  actualDeliveryAt: z.string().optional(),
  visibleInPortal: z.boolean(),
  notes: z.string().optional(),
});
export type ProcessInput = z.infer<typeof processSchema>;

// Criação direta de processo (staff) — antes era "abrir demanda", hoje já
// nasce no Kanban (fusão Demanda/Processo).
export const createProcessSchema = z.object({
  workspaceId: z.string().min(1, "Selecione a área de trabalho."),
  clientId: z.string().min(1, "Selecione um cliente."),
  companyId: z.string().optional().or(z.literal("")),
  /** Tipos de solicitação (etiquetas) da tarefa — o primeiro é o principal. */
  serviceTypeIds: z.array(z.string().min(1)).min(1, "Selecione ao menos um tipo de solicitação.").max(10, "No máximo 10 tipos por tarefa."),
  /** Modelo de tarefa usado de base (valor, prazo, anotações e checklist padrão), se houver. */
  templateId: z.string().optional().or(z.literal("")),
  description: z.string().min(3, "Informe o nome da tarefa."),
  priority: z.enum(DEMAND_PRIORITIES),
  value: z.string().optional(),
  paymentDueDate: z.string().optional(),
  requestedDeadline: z.string().optional(),
  notes: z.string().optional(),
  // Assistente "Nova Tarefa" (inspirado no FreelaPRO): coluna inicial,
  // cronograma e checklist definidos já na criação.
  stageId: z.string().optional().or(z.literal("")),
  plannedStartAt: z.string().optional(),
  dueAt: z.string().optional(),
  plannedDeliveryAt: z.string().optional(),
  checklist: z.array(z.string().min(1)).optional(),
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

// Pedido do portal com as respostas das perguntas personalizadas do cliente (id da pergunta → resposta).
export const clientRequestSchema = clientCreateProcessSchema.extend({
  answers: z.record(z.string(), z.string()).default({}),
});
export type ClientRequestInput = z.input<typeof clientRequestSchema>;
