import { z } from "zod";

export const DEMAND_PRIORITIES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;
export const DEMAND_STATUSES = [
  "NOVA",
  "EM_ANALISE",
  "AGUARDANDO_CLIENTE",
  "EM_EXECUCAO",
  "EM_REVISAO",
  "CONCLUIDA",
  "CANCELADA",
] as const;

export const demandSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente."),
  companyId: z.string().optional().or(z.literal("")),
  serviceTypeId: z.string().min(1, "Selecione o tipo de serviço."),
  description: z.string().min(5, "Descreva a demanda."),
  priority: z.enum(DEMAND_PRIORITIES),
  requestedDeadline: z.string().optional(),
  notes: z.string().optional(),
});
export type DemandInput = z.infer<typeof demandSchema>;
