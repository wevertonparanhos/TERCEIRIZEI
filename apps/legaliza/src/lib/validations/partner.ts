import { z } from "zod";
import { isValidCpfOnly } from "./document";

export const partnerSchema = z.object({
  name: z.string().min(2, "Informe o nome do sócio."),
  cpf: z.string().min(1, "Informe o CPF.").refine(isValidCpfOnly, "CPF inválido."),
  qualification: z.string().min(1, "Informe a qualificação (ex: Sócio Administrador)."),
  participationPercentage: z.coerce
    .number({ invalid_type_error: "Informe o percentual de participação." })
    .min(0.01, "A participação deve ser maior que 0%.")
    .max(100, "A participação não pode passar de 100%."),
  capitalContribution: z.string().optional(),
  administrator: z.boolean().default(false),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().optional(),
});
export type PartnerInput = z.infer<typeof partnerSchema>;
