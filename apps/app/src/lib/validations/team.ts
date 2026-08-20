import { z } from "zod";

export const STAFF_ROLES = ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"] as const;

export const inviteStaffSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
  role: z.enum(STAFF_ROLES),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
