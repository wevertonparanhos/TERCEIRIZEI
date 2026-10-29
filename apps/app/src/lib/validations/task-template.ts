import { z } from "zod";
import { DEMAND_PRIORITIES } from "@/lib/validations/process";

/** Modelo de tarefa (tarefa genérica pré-pronta): nome, valores padrão e checklist copiado para cada tarefa nova. */
export const taskTemplateSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao modelo.").max(80, "O nome pode ter até 80 caracteres."),
  /** valor padrão (R$) — vira a 1ª parcela da tarefa; vazio = sem valor */
  defaultPrice: z.number().min(0, "O valor não pode ser negativo.").max(10_000_000).nullable().default(null),
  defaultDeadlineDays: z.number().int("Use um número inteiro de dias.").min(0).max(730).nullable().default(null),
  defaultPriority: z.enum(DEMAND_PRIORITIES).nullable().default(null),
  defaultNotes: z.string().max(5000, "As anotações podem ter até 5000 caracteres.").default(""),
  active: z.boolean().default(true),
  checklist: z
    .array(z.object({ label: z.string().trim().min(1).max(200, "Cada item pode ter até 200 caracteres.") }))
    .max(60, "No máximo 60 itens no checklist.")
    .default([]),
});
export type TaskTemplateInput = z.input<typeof taskTemplateSchema>;
export type TaskTemplateData = z.output<typeof taskTemplateSchema>;
