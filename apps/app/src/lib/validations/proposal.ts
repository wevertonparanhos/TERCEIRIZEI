import { z } from "zod";

export const PAYMENT_METHODS = ["PIX", "Boleto", "Cartão de Crédito", "Transferência Bancária"] as const;

export const proposalItemSchema = z.object({
  description: z.string().trim().min(2, "Descreva o serviço."),
  detail: z.string().default(""),
  value: z.coerce.number().min(0, "O valor não pode ser negativo."),
});
export type ProposalItemInput = z.infer<typeof proposalItemSchema>;

export const extraSectionSchema = z.object({
  title: z.string().trim().min(1, "Dê um título à seção."),
  body: z.string().default(""),
});

/** Todo o conteúdo editável de uma proposta ou modelo (mesma forma nos dois). */
export const proposalContentSchema = z.object({
  title: z.string().trim().min(3, "Dê um título para a proposta."),
  intro: z.string().default(""),
  items: z.array(proposalItemSchema).default([]),
  discount: z.coerce.number().min(0).default(0),
  startImmediately: z.boolean().default(true),
  startDate: z.string().default(""),
  duration: z.string().default(""),
  paymentStructure: z.enum(["AVISTA", "PARCELADO"]).default("AVISTA"),
  installments: z.coerce.number().int().min(2).max(60).nullable().default(null),
  paymentMethods: z.array(z.string()).default([]),
  validDays: z.coerce.number().int().min(1).max(365).default(15),
  notes: z.string().default(""),
  extraSections: z.array(extraSectionSchema).default([]),
  coverUrl: z.string().trim().default(""),
  hideClientContact: z.boolean().default(false),
});
export type ProposalContent = z.infer<typeof proposalContentSchema>;

export const proposalResponseSchema = z.object({
  responseNote: z.string().optional(),
});
export type ProposalResponseInput = z.infer<typeof proposalResponseSchema>;
