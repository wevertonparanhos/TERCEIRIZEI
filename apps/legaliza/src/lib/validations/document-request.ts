import { z } from "zod";

export const documentRequestSchema = z.object({
  label: z.string().min(2, "Informe o que está sendo pedido (ex: RG do sócio administrador)."),
  deadline: z.string().optional().or(z.literal("")),
  notes: z.string().optional(),
});
export type DocumentRequestInput = z.infer<typeof documentRequestSchema>;
