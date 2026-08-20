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
  address: z.string().optional(),
  zipCode: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["ativo", "inativo"]),
  ownerUserId: z.string().uuid().optional().or(z.literal("")),
});
export type ClientInput = z.infer<typeof clientSchema>;

export const clientContactSchema = z.object({
  name: z.string().min(2, "Informe o nome do contato."),
  role: z.string().min(1, "Informe o papel do contato."),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().optional(),
});
export type ClientContactInput = z.infer<typeof clientContactSchema>;

export const companySchema = z.object({
  cnpj: z
    .string()
    .min(1, "Informe o CNPJ.")
    .refine((v) => isValidCpfCnpj(v) && v.replace(/\D/g, "").length === 14, "CNPJ inválido."),
  razaoSocial: z.string().min(2, "Informe a razão social."),
  nomeFantasia: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  cnae: z.string().optional(),
  naturezaJuridica: z.string().optional(),
  regimeTributario: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  openedAt: z.string().optional(),
  status: z.enum(["ativa", "inativa"]),
  notes: z.string().optional(),
});
export type CompanyInput = z.infer<typeof companySchema>;
