import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().min(2, "Descreva o item."),
  amount: z.coerce.number().positive("Informe um valor maior que zero."),
  processId: z.string().uuid().optional().or(z.literal("")),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Selecione um cliente."),
  companyId: z.string().optional().or(z.literal("")),
  dueDate: z.string().min(1, "Informe o vencimento."),
  notes: z.string().optional(),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;

export const markPaidSchema = z.object({
  paidAt: z.string().min(1, "Informe a data do pagamento."),
  paymentMethod: z.string().min(1, "Informe a forma de pagamento."),
  notes: z.string().optional(),
});
export type MarkPaidInput = z.infer<typeof markPaidSchema>;

export const generateInvoiceSchema = z.object({
  processIds: z.array(z.string().uuid()).min(1, "Selecione ao menos um processo."),
  dueDate: z.string().min(1, "Informe o vencimento."),
  grouped: z.boolean().default(true),
});
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;
