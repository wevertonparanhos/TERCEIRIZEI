import { z } from "zod";

export const PAYMENT_METHODS = ["PIX", "Boleto", "Transferência Bancária", "Cartão de Crédito"] as const;

/** Quando cada serviço é cobrado. */
export const DEFAULT_UNIT = "por solicitação";

export const proposalItemSchema = z.object({
  description: z.string().trim().min(2, "Descreva o serviço."),
  detail: z.string().default(""),
  unit: z.string().trim().default(""),
  value: z.coerce.number().min(0, "O valor não pode ser negativo."),
});
export type ProposalItemInput = z.infer<typeof proposalItemSchema>;

export const extraSectionSchema = z.object({
  title: z.string().trim().min(1, "Dê um título à seção."),
  body: z.string().default(""),
});

export const clauseSchema = z.object({
  key: z.string().min(1),
  title: z.string().trim().min(1, "Dê um título à cláusula."),
  body: z.string().default(""),
  mandatory: z.boolean().default(false),
});

/** Todo o conteúdo editável de uma proposta (contrato) ou modelo — mesma forma nos dois. */
export const proposalContentSchema = z.object({
  title: z.string().trim().min(3, "Dê um título para a proposta."),
  intro: z.string().default(""),
  items: z.array(proposalItemSchema).default([]),
  paymentMethods: z.array(z.string()).default(["PIX"]),
  /** Dia útil do mês seguinte em que vence o relatório do cliente. */
  dueBusinessDay: z.coerce.number().int().min(1).max(20).default(5),
  lateFeePercent: z.coerce.number().min(0).max(20).default(2),
  lateInterestPercent: z.coerce.number().min(0).max(10).default(1),
  noticeDays: z.coerce.number().int().min(0).max(180).default(30),
  /** null = prazo indeterminado */
  termMonths: z.coerce.number().int().min(1).max(120).nullable().default(null),
  foro: z.string().trim().min(2).default("Belo Horizonte/MG"),
  validDays: z.coerce.number().int().min(1).max(365).default(15),
  notes: z.string().default(""),
  clauses: z.array(clauseSchema).default([]),
  extraSections: z.array(extraSectionSchema).default([]),
  coverUrl: z.string().trim().default(""),
  hideClientContact: z.boolean().default(false),
});
export type ProposalContent = z.infer<typeof proposalContentSchema>;

export const proposalResponseSchema = z.object({
  responseNote: z.string().optional(),
});
export type ProposalResponseInput = z.infer<typeof proposalResponseSchema>;
