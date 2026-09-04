import { z } from "zod";

// Rótulos fixos da seção 54 do briefing — não texto livre, pra não inventar
// categorias de alteração que não foram pedidas.
export const AMENDMENT_ASPECTS = [
  "Endereço",
  "CNAE",
  "Objeto Social",
  "Capital",
  "Sócio",
  "Administrador",
  "Nome Empresarial",
  "Nome Fantasia",
  "Natureza Jurídica",
  "Porte",
  "Atividades",
] as const;

export const amendmentSchema = z.object({
  clientId: z.string().uuid("Selecione o cliente."),
  companyId: z.string().uuid("Selecione a empresa."),
  aspects: z.array(z.enum(AMENDMENT_ASPECTS)).min(1, "Selecione pelo menos um aspecto que está mudando."),
  state: z.string().length(2, "UF deve ter 2 letras."),
  municipality: z.string().min(1, "Informe o município."),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "URGENTE"]),
});
export type AmendmentInput = z.infer<typeof amendmentSchema>;
