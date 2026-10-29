import { z } from "zod";

export const DEFAULT_ACCENT = "#14528D";

export const portalSettingsSchema = z.object({
  welcomeMessage: z.string().trim().max(500, "A mensagem pode ter até 500 caracteres.").default(""),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Escolha uma cor válida.").default(DEFAULT_ACCENT),
  allowRequests: z.boolean().default(true),
  /** pedidos do cliente passam pela caixa de revisão (false = viram tarefa na hora) */
  reviewRequests: z.boolean().default(true),
  allowApprovals: z.boolean().default(true),
});

export const questionSchema = z.object({
  label: z.string().trim().min(3, "Escreva a pergunta.").max(200, "A pergunta pode ter até 200 caracteres."),
  kind: z.enum(["TEXTO", "TEXTO_LONGO"]).default("TEXTO_LONGO"),
  required: z.boolean().default(false),
});
export type QuestionInput = z.input<typeof questionSchema>;
export const MAX_QUESTIONS = 12;
export type PortalSettingsInput = z.infer<typeof portalSettingsSchema>;

/** "#14528D" → "20 82 141" (formato das variáveis de cor do tema). */
export function hexToRgbTriplet(hex: string): string | null {
  const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  if (!m) return null;
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`;
}

/** Versão bem clara da cor (fundo de destaques): mistura com branco. */
export function softAccentTriplet(hex: string, amount = 0.9): string | null {
  const t = hexToRgbTriplet(hex);
  if (!t) return null;
  return t
    .split(" ")
    .map((n) => Math.round(Number(n) + (255 - Number(n)) * amount))
    .join(" ");
}
