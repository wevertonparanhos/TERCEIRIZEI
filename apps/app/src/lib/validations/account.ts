import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
});
export type ProfileInput = z.infer<typeof profileSchema>;
