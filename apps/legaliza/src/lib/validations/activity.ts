import { z } from "zod";

// Sem base oficial de CNAE importada ainda — só validação de formato/obrigatoriedade.
export const activitySchema = z.object({
  cnae: z.string().min(1, "Informe o código CNAE."),
  description: z.string().min(2, "Informe a descrição da atividade."),
  isPrimary: z.boolean().default(false),
});
export type ActivityInput = z.infer<typeof activitySchema>;
