"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, SubmitButton, type FormState } from "@/components/ui/form";
import { updateOwnProfileAction } from "../actions";

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action] = useActionState(updateOwnProfileAction, {} as FormState);
  return (
    <form action={action} className="max-w-lg space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="E-mail" name="email" hint="Para trocar o e-mail, fale com o suporte.">
        <Input id="email" value={email} disabled readOnly />
      </Field>
      <Field label="Nome" name="name" error={state.errors?.name}>
        <Input id="name" name="name" defaultValue={name} autoComplete="name" required />
      </Field>
      <Field label="Celular" name="phone" error={state.errors?.phone} hint="Compartilhado só com o profissional de um pedido pago.">
        <Input id="phone" name="phone" type="tel" defaultValue={phone} autoComplete="tel" />
      </Field>
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}
