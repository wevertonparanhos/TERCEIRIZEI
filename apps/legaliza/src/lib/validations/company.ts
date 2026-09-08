import { z } from "zod";
import { isValidCnpjOnly } from "./document";

export const COMPANY_SIZES = ["MEI", "ME", "EPP", "DEMAIS"] as const;

export const companySchema = z.object({
  // Opcional: numa Abertura o CNPJ ainda não existe (só é emitido pela
  // Receita Federal numa das últimas etapas do workflow). Quando
  // preenchido, precisa ser um CNPJ válido.
  cnpj: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidCnpjOnly(v), "CNPJ inválido."),
  legalName: z.string().min(2, "Informe a razão social."),
  tradeName: z.string().optional(),
  legalNature: z.string().optional(),
  companySize: z.enum(COMPANY_SIZES).optional().or(z.literal("")),
  capital: z.string().optional(),
  stateRegistration: z.string().optional(),
  municipalRegistration: z.string().optional(),
  businessPurpose: z.string().optional(),
  status: z.enum(["ativa", "inativa"]),
});
export type CompanyInput = z.infer<typeof companySchema>;
