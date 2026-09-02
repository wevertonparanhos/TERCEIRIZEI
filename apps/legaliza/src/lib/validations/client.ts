import { z } from "zod";
import { isValidCpfCnpj } from "./document";

export const clientSchema = z.object({
  name: z.string().min(2, "Informe o nome ou razão social."),
  fantasyName: z.string().optional(),
  type: z.enum(["PF", "PJ"]),
  doc: z
    .string()
    .min(1, "Informe o CPF ou CNPJ.")
    .refine(isValidCpfCnpj, "CPF ou CNPJ inválido."),
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  status: z.enum(["ativo", "inativo"]),
});
export type ClientInput = z.infer<typeof clientSchema>;
