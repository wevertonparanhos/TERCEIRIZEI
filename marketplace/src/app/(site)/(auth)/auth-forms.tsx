"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Briefcase, House } from "lucide-react";
import { Field, FormMessage, Input, SubmitButton, type FormState } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { requestPasswordResetAction, signInAction, signUpAction, updatePasswordAction } from "./actions";

const initial: FormState = {};

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action] = useActionState(signInAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="redirect" value={redirectTo ?? ""} />
      <FormMessage state={state} />
      <Field label="E-mail" name="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required aria-invalid={!!state.errors?.email} />
      </Field>
      <Field label="Senha" name="password" error={state.errors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!state.errors?.password} />
      </Field>
      <div className="flex justify-end">
        <Link href="/recuperar-senha" className="text-sm font-medium text-brand hover:underline">Esqueci minha senha</Link>
      </div>
      <SubmitButton className="w-full" pendingText="Entrando…">Entrar</SubmitButton>
    </form>
  );
}

export function SignUpForm({ defaultRole, redirectTo }: { defaultRole: "CUSTOMER" | "PROVIDER"; redirectTo?: string }) {
  const [state, action] = useActionState(signUpAction, initial);
  const [role, setRole] = useState(defaultRole);

  if (state.ok) return <FormMessage state={state} />;

  const options = [
    { value: "CUSTOMER", label: "Quero contratar", hint: "Para minha casa", icon: House },
    { value: "PROVIDER", label: "Quero trabalhar", hint: "Sou profissional", icon: Briefcase },
  ] as const;

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="redirect" value={redirectTo ?? ""} />
      <FormMessage state={state} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Tipo de conta</legend>
        <div className="grid grid-cols-2 gap-3">
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-2xl border p-4 transition",
                role === o.value ? "border-brand bg-brand-soft ring-2 ring-brand/20" : "border-line-strong bg-surface hover:border-brand/40",
              )}
            >
              <input type="radio" name="role" value={o.value} checked={role === o.value} onChange={() => setRole(o.value)} className="sr-only" />
              <o.icon className="size-5 text-brand" aria-hidden />
              <span className="text-sm font-semibold">{o.label}</span>
              <span className="text-xs text-muted">{o.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label={role === "PROVIDER" ? "Nome completo" : "Nome"} name="name" error={state.errors?.name}>
        <Input id="name" name="name" autoComplete="name" defaultValue={state.values?.name} required aria-invalid={!!state.errors?.name} />
      </Field>
      <Field label="E-mail" name="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required aria-invalid={!!state.errors?.email} />
      </Field>
      <Field label="Celular (opcional)" name="phone" error={state.errors?.phone} hint="Com DDD. Não é exibido publicamente.">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(31) 99999-9999" defaultValue={state.values?.phone} aria-invalid={!!state.errors?.phone} />
      </Field>
      <Field label="Senha" name="password" error={state.errors?.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={!!state.errors?.password} />
      </Field>

      <div className="space-y-2 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="acceptTerms" defaultChecked={state.values?.acceptTerms === "on"} className="mt-1 size-4 accent-[var(--color-brand)]" required />
          <span>
            Li e aceito os <Link href="/termos" target="_blank" className="font-medium text-brand hover:underline">Termos de uso</Link> e a{" "}
            <Link href="/privacidade" target="_blank" className="font-medium text-brand hover:underline">Política de privacidade</Link>.
          </span>
        </label>
        {state.errors?.acceptTerms ? <p className="text-xs font-medium text-danger" role="alert">{state.errors.acceptTerms[0]}</p> : null}
        <label className="flex items-start gap-2 text-muted">
          <input type="checkbox" name="marketing" defaultChecked={state.values?.marketing === "on"} className="mt-1 size-4 accent-[var(--color-brand)]" />
          <span>Quero receber novidades e promoções por e-mail (opcional).</span>
        </label>
      </div>

      <SubmitButton className="w-full" pendingText="Criando conta…">Criar conta grátis</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initial);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="E-mail da conta" name="email" error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Enviando…">Enviar link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, initial);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Nova senha" name="password" error={state.errors?.password} hint="Mínimo de 8 caracteres, com letras e números.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirme a nova senha" name="confirm" error={state.errors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full">Salvar nova senha</SubmitButton>
    </form>
  );
}
