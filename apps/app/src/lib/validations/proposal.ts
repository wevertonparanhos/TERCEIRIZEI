import { z } from "zod";

export const proposalItemSchema = z.object({
  description: z.string().min(2, "Descreva o item."),
  value: z.coerce.number().positive("Informe um valor maior que zero."),
});
export type ProposalItemInput = z.infer<typeof proposalItemSchema>;

export const proposalSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente."),
  title: z.string().min(3, "Dê um título para a proposta."),
  validUntil: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});
export type ProposalInput = z.infer<typeof proposalSchema>;

export const proposalResponseSchema = z.object({
  responseNote: z.string().optional(),
});
export type ProposalResponseInput = z.infer<typeof proposalResponseSchema>;
