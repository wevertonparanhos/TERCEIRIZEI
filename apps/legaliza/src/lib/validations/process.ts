import { z } from "zod";

export const PROCESS_TYPES = ["OPENING", "AMENDMENT", "TRANSFORMATION", "CLOSURE"] as const;
export const PROCESS_PRIORITIES = ["BAIXA", "MEDIA", "ALTA", "URGENTE"] as const;

export const processSchema = z
  .object({
    clientId: z.string().uuid("Selecione o cliente."),
    companyId: z.string().uuid().optional().or(z.literal("")),
    type: z.enum(PROCESS_TYPES),
    priority: z.enum(PROCESS_PRIORITIES),
    state: z.string().length(2, "UF deve ter 2 letras."),
    municipality: z.string().min(1, "Informe o município."),
  })
  .refine((data) => data.type === "OPENING" || !!data.companyId, {
    message: "Selecione a empresa (obrigatória para este tipo de processo).",
    path: ["companyId"],
  });
export type ProcessInput = z.infer<typeof processSchema>;
