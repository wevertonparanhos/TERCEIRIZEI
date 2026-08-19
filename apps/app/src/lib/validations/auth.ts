import { z } from "zod";
import { isValidCpfCnpj } from "./document";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
  password: z.string().min(1, "Informe a senha."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const signupSchema = z
  .object({
    name: z.string().min(2, "Informe seu nome completo ou razão social."),
    doc: z
      .string()
      .min(1, "Informe seu CPF ou CNPJ.")
      .refine(isValidCpfCnpj, "CPF ou CNPJ inválido."),
    phone: z.string().min(8, "Informe um telefone válido."),
    email: z.string().min(1, "Informe o e-mail.").email("E-mail inválido."),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string().min(1, "Confirme a senha."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });
export type SignupInput = z.infer<typeof signupSchema>;
