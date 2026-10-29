"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupInput } from "@/lib/validations/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { registerAccount } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) });

  async function onSubmit(values: SignupInput) {
    setServerError(null);
    setSubmitting(true);

    const result = await registerAccount(values);
    if (!result.ok) {
      setSubmitting(false);
      setServerError(result.error);
      return;
    }

    // A conta já nasce confirmada: entra direto com a senha recém-criada.
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email: values.email.trim().toLowerCase(), password: values.password });
    setSubmitting(false);

    if (error) {
      setServerError("Conta criada! Não conseguimos entrar automaticamente — use a tela de entrada com o seu e-mail e senha.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} method="post" className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome completo ou razão social</Label>
        <Input id="name" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="doc">CPF ou CNPJ</Label>
        <Input id="doc" inputMode="numeric" placeholder="000.000.000-00" {...register("doc")} />
        {errors.doc && <p className="text-xs text-red-600">{errors.doc.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" inputMode="tel" placeholder="(31) 90000-0000" {...register("phone")} />
        {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
