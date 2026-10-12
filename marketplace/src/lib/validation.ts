import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .min(min, `${label} deve ter ao menos ${min} caracteres.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || /^\d{10,11}$/.test(v), "Informe DDD + número (10 ou 11 dígitos).");

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter ao menos 8 caracteres.")
  .max(72, "A senha deve ter no máximo 72 caracteres.")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letras e números.");

export const signUpSchema = z.object({
  name: trimmed(2, 80, "Nome"),
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(["CUSTOMER", "PROVIDER"]),
  acceptTerms: z.literal("on", { error: "É preciso aceitar os termos e a política de privacidade." }),
  marketing: z.literal("on").optional(),
});

export const signInSchema = z.object({
  email: z.email("E-mail inválido.").trim().toLowerCase(),
  password: z.string().min(1, "Informe a senha."),
});

export const emailSchema = z.object({ email: z.email("E-mail inválido.").trim().toLowerCase() });

export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." });

export const profileSchema = z.object({
  name: trimmed(2, 80, "Nome"),
  phone: phoneSchema,
});

export const providerProfileSchema = z.object({
  displayName: trimmed(2, 60, "Nome profissional"),
  bio: z.string().trim().max(800, "Máximo de 800 caracteres.").optional().default(""),
  phone: phoneSchema.refine((v) => v !== "", "Telefone é obrigatório para receber pedidos."),
  whatsapp: phoneSchema,
  baseCity: trimmed(2, 60, "Cidade"),
  baseState: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "UF com 2 letras."),
  experienceYears: z.coerce.number().int().min(0).max(60).optional(),
  qualifications: z.string().trim().max(800, "Máximo de 800 caracteres.").optional().default(""),
});

/** Primeiro erro de cada campo, no formato usado pelos formulários. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}
