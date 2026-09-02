import { z } from "zod";
import { isValidCepFormat } from "./document";

export const addressSchema = z.object({
  cep: z.string().min(1, "Informe o CEP.").refine(isValidCepFormat, "CEP inválido (8 dígitos)."),
  street: z.string().min(1, "Informe o logradouro."),
  number: z.string().min(1, "Informe o número."),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Informe o bairro."),
  city: z.string().min(1, "Informe a cidade."),
  state: z.string().length(2, "UF deve ter 2 letras."),
});
export type AddressInput = z.infer<typeof addressSchema>;
